import { coerce, Context, Dict, ForkScope, Logger, MainScope, makeArray, Plugin, Schema } from '@spakjs/core'
import { FSWatcher, watch, WatchOptions } from 'chokidar'
import { relative, resolve } from 'path'
import { createRequire } from 'module'
import { Loader, unwrapExports } from '@spakjs/loader'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { handleError } from './error'

declare module '@spakjs/core' {
  interface Context {
    watcher: Watcher
  }

  namespace Context {
    interface Config {
      watch?: Watcher.Config
    }
  }

  interface Events {
    'hmr/reload'(reloads: Map<Plugin, Reload>): void
  }
}

// Use Node.require style module access via createRequire for both CJS and ESM builds
const coreRequire = createRequire(require.resolve('@spakjs/core/package.json'))
const loaderRequire = createRequire(require.resolve('@spakjs/loader/package.json'))

function loadDependencies(filename: string, ignored: Set<string>) {
  const dependencies = new Set<string>()
  function traverse({ filename, children }: NodeJS.Module) {
    if (ignored.has(filename) || dependencies.has(filename) || filename.includes('/node_modules/')) return
    dependencies.add(filename)
    if (!children) return
    children.forEach(traverse)
  }
  const mod = coreRequire.cache[filename]
  if (mod) traverse(mod)
  return dependencies
}

interface Reload {
  filename: string
  children: Map<ForkScope, string>
}

class Watcher {
  static inject = ['loader']

  private base: string
  private watcher: FSWatcher
  // use the loader createRequire context so plugins resolve to the same tree as loader
  private loaderRequire = loaderRequire

  /**
   * changes from externals E will always trigger a full reload
   *
   * - root R -> external E -> none of plugin Q
   */
  private externals: Set<string>

  /**
   * files X that should be reloaded
   *
   * - including all stashed files S
   * - some plugin P -> file X -> some change C
   */
  private accepted: Set<string>

  /**
   * files X that should not be reloaded
   *
   * - including all externals E
   * - some change C -> file X -> none of change D
   */
  private declined: Set<string>

  /** stashed changes */
  private stashed = new Set<string>()

  private logger: Logger

  constructor(private ctx: Context, private config: Watcher.Config) {
    this.base = resolve(ctx.baseDir, config.base || '')
    this.logger = ctx.logger('hmr')
    ctx.provide('watcher', this)
    ctx.on('ready', () => this.start())
    ctx.on('dispose', () => this.stop())
  }

  relative(filename: string) {
    if (!this.base) return filename
    return relative(this.base, filename)
  }

  start() {
    const { loader } = this.ctx
    const { root, ignored } = this.config
    this.watcher = watch(root, {
      ...this.config,
      cwd: this.base,
      ignored: makeArray(ignored),
    })

    // files independent from any plugins will trigger a full reload
    try {
      this.externals = loadDependencies(require.resolve('@spakjs/core/package.json'), new Set(Object.values(loader.cache)))
    } catch {
      this.externals = new Set()
    }
    const triggerLocalReload = this.ctx.debounce(() => this.triggerLocalReload(), this.config.debounce)

    this.watcher.on('change', async (path) => {
      const filename = resolve(this.base, path)
      const isEntry = filename === loader.filename || (loader.envFiles && loader.envFiles.includes(filename))
      if (loader.suspend && isEntry) {
        loader.suspend = false
        return
      }

      this.logger.debug('change detected:', path)

      if (isEntry) {
        if (coreRequire.cache[filename]) {
          this.ctx.loader.fullReload()
        } else {
          try {
            const config = await loader.readConfig()
            this.ctx.root.state.update(config)
            this.ctx.emit('config')
          } catch (err) {
            this.logger.warn(coerce(err))
          }
        }
      } else {
        if (this.externals.has(filename)) {
          this.ctx.loader.fullReload()
        } else if (coreRequire.cache[filename]) {
          this.stashed.add(filename)
          triggerLocalReload()
        }
      }
    })
  }

  stop() {
    return this.watcher.close()
  }

  private analyzeChanges() {
    /** files pending classification */
    const pending: string[] = []

    this.accepted = new Set(this.stashed)
    this.declined = new Set(this.externals)

    this.stashed.forEach((filename) => {
      const mod = coreRequire.cache[filename]
      if (!mod || !mod.children) return
      for (const { filename } of mod.children) {
        if (this.accepted.has(filename) || this.declined.has(filename) || filename.includes('/node_modules/')) continue
        pending.push(filename)
      }
    })

    while (pending.length) {
      let index = 0, hasUpdate = false
      while (index < pending.length) {
        const filename = pending[index]
        const mod = coreRequire.cache[filename]
        if (!mod) {
          pending.splice(index, 1)
          this.declined.add(filename)
          continue
        }
        const children = mod.children || []
        let isDeclined = true, isAccepted = false
        for (const { filename } of children) {
          // ignore all declined children
          if (this.declined.has(filename) || filename.includes('/node_modules/')) continue
          if (this.accepted.has(filename)) {
            // mark the module as accepted if any child is accepted
            isAccepted = true
            break
          } else {
            // the child module is neither accepted nor declined
            // so we need to perform further analysis
            isDeclined = false
            if (!pending.includes(filename)) {
              hasUpdate = true
              pending.push(filename)
            }
          }
        }
        if (isAccepted || isDeclined) {
          hasUpdate = true
          pending.splice(index, 1)
          if (isAccepted) {
            this.accepted.add(filename)
          } else {
            // mark the module as declined if all children are declined
            this.declined.add(filename)
          }
        } else {
          index++
        }
      }
      // infinite loop
      if (!hasUpdate) break
    }

    for (const filename of pending) {
      this.declined.add(filename)
    }
  }

  private triggerLocalReload() {
    this.analyzeChanges()

    /** plugins pending classification */
    const pending = new Map<string, [Plugin, MainScope]>()

    /** plugins that should be reloaded */
    const reloads = new Map<Plugin, Reload>()

    // we assume that plugin entry files are "atomic"
    // that is, reloading them will not cause any other reloads
    for (const filename of Object.values(this.ctx.loader.cache)) {
      const module = coreRequire.cache[filename]
      if (!module) continue
      const plugin = unwrapExports(module.exports)
      if (!plugin || this.declined.has(filename)) continue
      const runtime = this.ctx.registry.get(plugin)
      pending.set(filename, [plugin, runtime])
      this.declined.add(filename)
    }

    for (const [filename, [plugin, runtime]] of pending) {
      // check if it is a dependent of the changed file
      this.declined.delete(filename)
      const dependencies = [...loadDependencies(filename, this.declined)]
      this.declined.add(filename)

      // we only detect reloads at plugin level
      // a plugin will be reloaded if any of its dependencies are accepted
      if (!dependencies.some(dep => this.accepted.has(dep))) continue
      dependencies.forEach(dep => this.accepted.add(dep))

      // prepare for reload
      if (runtime) {
        let isMarked = false
        const visited = new Set<MainScope>()
        const queued = [runtime]
        while (queued.length) {
          const runtime = queued.shift()
          if (visited.has(runtime)) continue
          visited.add(runtime)
          if (reloads.has(plugin)) {
            isMarked = true
            break
          }
          for (const state of runtime.children) {
            queued.push(state.runtime)
          }
        }
        if (!isMarked) {
          const children = new Map<ForkScope, string>()
          reloads.set(plugin, { filename, children })
          for (const state of runtime.children) {
            children.set(state, this.ctx.loader.getRefName(state))
          }
        }
      } else {
        reloads.set(plugin, { filename, children: new Map() })
      }
    }

    // save require.cache for rollback
    // and delete module cache before re-require
    const backup: Dict<NodeJS.Module> = {}
    for (const filename of this.accepted) {
      backup[filename] = coreRequire.cache[filename]
      delete coreRequire.cache[filename]
    }

    /** rollback require.cache */
    function rollback() {
      for (const filename in backup) {
        coreRequire.cache[filename] = backup[filename]
      }
    }

    // attempt to load entry files
    const attempts: Dict<any> = {}
    try {
      for (const [, { filename }] of reloads) {
        attempts[filename] = unwrapExports(this.loaderRequire(filename))
      }
    } catch (e) {
      handleError(e, this.logger)
      return rollback()
    }

    // emit reload event before replacing loader cache
    this.ctx.emit('hmr/reload', reloads)

    try {
      for (const [plugin, { filename, children }] of reloads) {
        const path = this.relative(filename)

        try {
          this.ctx.registry.delete(plugin)
        } catch (err) {
          this.logger.warn('failed to dispose plugin at %c\n' + coerce(err), path)
        }

        // replace loader cache for `keyFor` method
        this.ctx.loader.replace(plugin, attempts[filename])

        try {
          for (const [state, name] of children as unknown as Iterable<[any, any]>) {
            const fork = state.parent.plugin(attempts[filename], state.config) as any
            fork.key = state.key
            if (name) state.parent.scope[Loader.kRecord][name] = fork
          }
          this.logger.info('reload plugin at %c', path)
        } catch (err) {
          this.logger.warn('failed to reload plugin at %c\n' + coerce(err), path)
          throw err
        }
      }
    } catch {
      // rollback require.cache and plugin states
      rollback()
      for (const [plugin, { filename, children }] of reloads) {
        try {
          this.ctx.registry.delete(attempts[filename])
          for (const [state, name] of children as unknown as Iterable<[any, any]>) {
            const fork = state.parent.plugin(plugin, state.config) as any
            fork.key = state.key
            if (name) state.parent.scope[Loader.kRecord][name] = fork
          }
        } catch (err) {
          this.logger.warn(err)
        }
      }
      return
    }

    // reset stashed files
    this.stashed = new Set()
  }
}

// Load locale yaml synchronously and feed into i18n config (avoid require('./*.yml'))
function readLocaleYml(name: string) {
  try {
    const content = readFileSync(resolve(__dirname, 'locales', `${name}.yml`), 'utf8')
    return load(content)
  } catch {
    return undefined
  }
}

namespace Watcher {
  export interface Config extends WatchOptions {
    base?: string
    root?: string[]
    debounce?: number
    ignored?: string[]
  }

  export const Config: Schema<Config> = Schema.object({
    base: Schema.string(),
    root: Schema.union([
      Schema.array(String).role('table'),
      Schema.transform(String, (value) => [value]),
    ]).default(['.']),
    ignored: Schema.union([
      Schema.array(String).role('table'),
      Schema.transform(String, (value) => [value]),
    ]).default([
      '**/node_modules/**',
      '**/.git/**',
      '**/logs/**',
    ]),
    debounce: Schema.natural().role('ms').default(100),
  }).i18n({
    'zh-CN': readLocaleYml('zh-CN'),
    'en-US': readLocaleYml('en-US'),
  })
}

export default Watcher
