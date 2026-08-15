import { Context, Dict, EffectScope, ForkScope, interpolate, isNullable, Logger, Plugin, valueMap, version } from '@spakjs/core'
import { constants, promises as fs } from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { T } from '@spakjs/i18n'

export class FullReloadError extends Error {
  constructor(public readonly code: number) {
    super(`Full reload requested with exit code ${code}`)
    this.name = 'FullReloadError'
  }
}

declare module '@spakjs/core' {
  interface Events {
    'config'(): void
    'exit'(signal: NodeJS.Signals): Promise<void>
  }

  interface Context {
    loader: Loader
  }

  namespace Context {
    interface Config {
      name?: string
      plugins?: Dict
    }
  }

  interface EnvData {
    startTime?: number
  }
}

// EffectScope augmentation handled by @spakjs/core

export function unwrapExports(module: any) {
  return module?.default || module
}

function separate(source: any, isGroup = false) {
  const config: any = {}, meta: any = {}
  for (const [key, value] of Object.entries(source || {})) {
    if (key.startsWith('$')) {
      meta[key] = value
    } else {
      config[key] = value
    }
  }
  return [isGroup ? source : config, meta]
}

const kUpdate = Symbol('update')

const group: Plugin.Object<Context> = {
  name: 'group',
  reusable: true,
  apply(ctx, plugins) {
    ctx.scope[Loader.kRecord] ||= Object.create(null)

    for (const name in plugins || {}) {
      if (name.startsWith('~') || name.startsWith('$')) continue
      ctx.loader.reload(ctx, name, plugins[name])
    }

    ctx.accept((neo) => {
      // update config reference
      const old = ctx.scope.config

      // update inner plugins
      for (const key in { ...old, ...neo }) {
        if (key.startsWith('~') || key.startsWith('$')) continue
        const fork = ctx.scope[Loader.kRecord][key]
        if (!fork) {
          ctx.loader.reload(ctx, key, neo[key])
        } else if (!(key in neo)) {
          ctx.loader.unload(ctx, key)
        } else {
          ctx.loader.reload(ctx, key, neo[key] || {})
        }
      }
    }, { passive: true })
  },
}

/**
 * Insert keys from `temp` into `object`, preserving the order of keys in `rest`.
 * Uses an ordered key list to avoid reliance on Object.keys() enumeration order.
 */
function insertKey(object: Record<string, any>, temp: Record<string, any>, rest: string[]) {
  for (const key of rest) {
    temp[key] = object[key]
    delete object[key]
  }
  Object.assign(object, temp)
}

/**
 * Rename a property in `object` from `old` to `neo`, preserving key order.
 * Uses an explicit ordered key list to maintain insertion order consistently.
 */
function rename(object: Record<string, any>, old: string, neo: string, value: any) {
  // Maintain an ordered list of keys to avoid relying on Object.keys() enumeration order
  const allKeys = Object.keys(object)
  const index = allKeys.findIndex(key => key === old || key === '~' + old)
  const orderedKeys = index < 0 ? [] : allKeys.slice(index + 1)
  const temp: Record<string, any> = { [neo]: value }
  delete object[old]
  delete object['~' + old]
  insertKey(object, temp, orderedKeys)
}

const writable = {
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
}

export abstract class Loader {
  static readonly kRecord = Symbol.for('spak.loader.record')
  static readonly exitCode = 51
  static readonly extensions = new Set(Object.keys(writable))

  // process
  public baseDir = process.cwd()
  public envData = process.env.SPAK_SHARED
    ? JSON.parse(process.env.SPAK_SHARED)
    : { startTime: Date.now() }

  public params = {
    env: process.env,
  }

  public app: Context
  public config: Context.Config
  public entry: Context
  public suspend = false
  public writable = false
  public mime: string
  public filename: string
  public envFiles: string[]
  public names = new Set<string>()
  public cache: Dict = Object.create(null)
  public prolog: Logger.Record[] = []

  private store = new WeakMap<any, string>()

  private _writeTask?: Promise<void>
  private _writeSilent = true

  abstract fullReload(code?: number): void
  abstract import(name: string): Promise<any>

  constructor() {
    Logger.targets.push({
      colors: 3,
      record: (record) => {
        this.prolog.push(record)
        this.prolog = this.prolog.slice(-1000)
      },
    })
  }

  async init(filename?: string) {
    if (filename) {
      filename = path.resolve(this.baseDir, filename)
      const stats = await fs.stat(filename)
      if (stats.isFile()) {
        this.filename = filename
        this.baseDir = path.dirname(filename)
        const extname = path.extname(filename)
        this.mime = writable[extname]
        if (!Loader.extensions.has(extname)) {
          throw new Error(`extension "${extname}" not supported`)
        }
      } else {
        this.baseDir = filename
        await this.findConfig()
      }
    } else {
      await this.findConfig()
    }
    if (this.mime) {
      try {
        await fs.access(this.filename, constants.W_OK)
        this.writable = true
      } catch (err) {
        if (process.env.SPAK_DEBUG) console.debug('[loader] config not writable:', (err as any)?.message ?? String(err))
      }
    }
    this.envFiles = [
      path.resolve(this.baseDir, '.env'),
      path.resolve(this.baseDir, '.env.local'),
    ]
  }

  private async findConfig() {
    // Search order:
    // 1. Current dir (./spak.config.* / ./spak.*)
    // 2. XDG config dir (~/.config/spak/config.*)
    // 3. Home dir (~/.spak.config.* / ~/.spak.*)
    const searchDirs = [
      this.baseDir,
      path.resolve(process.env.HOME || '/root', '.config', 'spak-cli'),
      path.resolve(process.env.HOME || '/root'),
    ]

    for (const dir of searchDirs) {
      try {
        const files = await fs.readdir(dir)
        for (const basename of ['spak.config', 'spak']) {
          for (const extname of Loader.extensions) {
            if (files.includes(basename + extname)) {
              this.mime = writable[extname]
              this.filename = path.resolve(dir, basename + extname)
              this.baseDir = dir
              return
            }
          }
        }
      } catch {
        // Skip if directory does not exist
        continue
      }
    }

    throw new Error(T('spak.loader.config_not_found', {
      path1: path.resolve(this.baseDir, 'spak.config.*'),
      path2: path.resolve(process.env.HOME || '/root', '.config', 'spak-cli', 'spak.config.*'),
      path3: path.resolve(process.env.HOME || '/root', '.spak.config.*'),
    }))
  }

  async readConfig(initial = false) {
    if (this.mime === 'application/yaml') {
      this.config = yaml.load(await fs.readFile(this.filename, 'utf8')) as any
    } else if (this.mime === 'application/json') {
      // we do not use require here because it will pollute require.cache
      this.config = JSON.parse(await fs.readFile(this.filename, 'utf8')) as any
    } else {
      const module = await import(this.filename)
      this.config = module.default || module
    }

    if (this.writable) await this.writeConfig(true)
    return new Context.Config(this.interpolate(this.config))
  }

  private async _writeConfig(silent = false) {
    this.suspend = true
    if (!this.writable) {
      throw new Error(`cannot overwrite readonly config`)
    }
    // Snapshot config *before* any async IO so we never write a half-mutated
    // object if another caller mutates `this.config` while we're writing.
    const snapshot = this.mime === 'application/yaml'
      ? yaml.dump(this.config)
      : JSON.stringify(this.config, null, 2)
    const tmpFile = this.filename + '.tmp.' + Math.random().toString(36).slice(2, 8)
    try {
      if (this.mime === 'application/yaml' || this.mime === 'application/json') {
        await fs.writeFile(tmpFile, snapshot)
      }
      await fs.rename(tmpFile, this.filename)
    } catch (err) {
      try { await fs.unlink(tmpFile) } catch { /* ignore cleanup errors */ }
      throw err
    }
    if (!silent) this.app.emit('config')
  }

  writeConfig(silent = false) {
    this._writeSilent &&= silent
    if (this._writeTask) return this._writeTask
    const finalSilent = this._writeSilent
    return this._writeTask = new Promise((resolve, reject) => {
      setTimeout(() => {
        this._writeSilent = true
        this._writeTask = undefined
        this._writeConfig(finalSilent).then(resolve, reject)
      }, 0)
    })
  }

  interpolate(source: any) {
    if (typeof source === 'string') {
      return interpolate(source, this.params, /\$\{\{(.+?)\}\}/g)
    } else if (!source || typeof source !== 'object') {
      return source
    } else if (Array.isArray(source)) {
      return source.map(item => this.interpolate(item))
    } else {
      return valueMap(source, item => this.interpolate(item))
    }
  }

  async resolve(name: string) {
    const plugin = unwrapExports(await this.import(name))
    if (plugin) this.store.set(this.app.registry.resolve(plugin), name)
    return plugin
  }

  keyFor = (plugin: any) => {
    const name = this.store.get(this.app.registry.resolve(plugin))
    if (name) return name.replace(/(spak-|^@spakjs\/)plugin-/, '')
  }

  replace = (oldKey: any, newKey: any) => {
    oldKey = this.app.registry.resolve(oldKey)
    newKey = this.app.registry.resolve(newKey)
    const name = this.store.get(oldKey)
    if (!name) return
    this.store.set(newKey, name)
    this.store.delete(oldKey)
  }

  private forkPlugin = async (name: string, config: any, parent: Context) => {
    const plugin = await this.resolve(name)
    if (!plugin) return

    return parent.plugin(plugin, this.interpolate(config))
  }

  isTruthyLike = (expr: any) => {
    if (isNullable(expr)) return true
    if (typeof expr === 'boolean') return expr
    if (typeof expr === 'number') return !!expr
    // $if 在 config 里的常见用法：'$if: env.NODE_ENV === "development"'，交给 interpolate + 简单路径解析
    if (typeof expr === 'string') {
      const interpolated = this.interpolate(`\${{ ${expr} }}`)
      if (interpolated !== '' && interpolated !== undefined) {
        // 如果插值替换后有内容，说明找到了对应属性；再根据常见值判断真假
        if (interpolated === 'false' || interpolated === '0' || interpolated === 'null' || interpolated === 'undefined') return false
        return true
      }
      // 纯字面量真假判断
      const trimmed = expr.trim().toLowerCase()
      if (['true', '1', 'yes', 'on'].includes(trimmed)) return true
      if (['false', '0', 'no', 'off', ''].includes(trimmed)) return false
      return !!expr
    }
    return !!expr
  }

  private logUpdate = (type: string, parent: Context, key: string) => {
    this.app.logger('loader').info('%s plugin %c', type, key)
  }

  reload = async (parent: Context, key: string, source: any) => {
    let fork = parent.scope[Loader.kRecord][key]
    const name = key.split(':', 1)[0]
    const [config, meta] = separate(source, name === 'group')
    if (fork) {
      if (!this.isTruthyLike(meta.$if)) {
        this.unload(parent, key)
        return
      }
      fork[kUpdate] = true
      fork.update(config)
    } else {
      if (!this.isTruthyLike(meta.$if)) return
      this.logUpdate('apply', parent, key)
      const ctx = parent.extend()
      if (name === 'group') {
        fork = ctx.plugin(group, config)
      } else {
        fork = await this.forkPlugin(name, config, ctx)
      }
      if (!fork) return
      fork.key = key.slice(name.length + 1)
      parent.scope[Loader.kRecord][key] = fork
    }
    const filter = this.interpolate(meta.$filter)
    fork.parent.filter = (session) => {
      return parent.filter(session) && (isNullable(filter) || session.resolve(filter))
    }
    return fork
  }

  unload = (ctx: Context, key: string) => {
    const fork = ctx.scope[Loader.kRecord][key]
    if (fork) fork.dispose()
  }

  getRefName = (fork: ForkScope) => {
    const record = fork.parent.scope[Loader.kRecord]
    if (!record) return
    for (const name in record) {
      if (record[name] !== fork) continue
      return name
    }
  }

  paths = (scope: EffectScope): string[] => {
    // root scope
    if (scope === scope.parent.scope) return []

    // runtime scope
    if (scope.runtime === scope && scope.runtime?.children) {
      const childPaths = scope.runtime.children.map(child => this.paths(child))
      return childPaths.flat() as string[]
    }

    const scopeAny = scope as any
    if (scopeAny.key) return [scopeAny.key]
    return this.paths(scope.parent.scope)
  }

  async createApp() {
    new Logger('app').info('%C', `Spak/${version}`)
    const app = this.app = new Context(this.interpolate(this.config))
    app.provide('loader', this, true)
    app.provide('baseDir', this.baseDir, true)
    app.scope[Loader.kRecord] = Object.create(null)
    const fork = await this.reload(app, 'group:entry', (this.config as any).plugins || {})
    this.entry = fork.ctx

    app.accept((config) => {
      app.spak.config = config
    })

    app.accept(['plugins'], (config) => {
      this.reload(app, 'group:entry', config.plugins)
    }, { passive: true })

    app.on('dispose', () => {
      this.fullReload()
    })

    // write config with `~` prefix
    app.on('internal/fork', (fork) => {
      if (fork.uid || !fork.parent.scope[Loader.kRecord]) return
      const key = Object.keys(fork.parent.scope[Loader.kRecord]).find(key => {
        return fork.parent.scope[Loader.kRecord][key] === fork
      })
      if (!key) return
      this.logUpdate('unload', fork.parent, key)
      delete fork.parent.scope[Loader.kRecord][key]
      if (!app.registry.has(fork.runtime.plugin)) return
      rename(fork.parent.scope.config, key, '~' + key, fork.parent.scope.config[key])
      this.writeConfig()
    })

    app.on('internal/update', (fork) => {
      const key = this.getRefName(fork)
      if (key) this.logUpdate('reload', fork.parent, key)
    })

    app.on('internal/before-update', (fork, config) => {
      if (fork[kUpdate]) return delete fork[kUpdate]
      const name = this.getRefName(fork)
      if (!name) return
      const { schema } = fork.runtime
      fork.parent.scope.config[name] = {
        ...separate(fork.parent.scope.config[name])[1],
        ...schema ? schema.simplify(config) : config,
      }
      this.writeConfig()
    })

    return app
  }
}

export default Loader
