import { Dict, Logger } from '@spakjs/core'
import { promises as fs } from 'fs'
import * as dotenv from 'dotenv'
import ns from 'ns-require'
import Loader, { FullReloadError } from './shared'
import { createRequire } from 'module'

export * from './shared'

const _require = createRequire(__filename)

const logger = new Logger('app')

// Use file extension detection instead of deprecated require.extensions
for (const ext of ['.json', '.yaml', '.yml']) {
  Loader.extensions.add(ext)
}

const initialKeys = Object.getOwnPropertyNames(process.env)

export default class NodeLoader extends Loader {
  public scope: ns.Scope
  public localKeys: string[] = []
  public exitOnReload = true

  async init(filename?: string) {
    await super.init(filename)
    this.scope = ns({
      namespace: 'spakjs',
      prefix: 'plugin',
      official: 'spakjs',
      dirname: this.baseDir,
    })
  }

  async readConfig(initial = false) {
    // remove local env variables
    for (const key of this.localKeys) {
      delete process.env[key]
    }

    // load env files
    const parsed = {}
    for (const filename of this.envFiles) {
      try {
        const raw = await fs.readFile(filename, 'utf8')
        Object.assign(parsed, dotenv.parse(raw))
      } catch (err) {
        if (process.env.SPAK_DEBUG) console.debug('[loader] skip env file:', filename, (err as any)?.message ?? String(err))
      }
    }

    // write local env into process.env
    this.localKeys = []
    for (const key in parsed) {
      if (initialKeys.includes(key)) continue
      process.env[key] = parsed[key]
      this.localKeys.push(key)
    }

    return await super.readConfig(initial)
  }

  async import(name: string) {
    try {
      if (!this.cache[name]) {
        try {
          this.cache[name] = _require.resolve(name)
        } catch {
          this.cache[name] = this.scope.resolve(name)
        }
      }
    } catch (err) {
      logger.error(err.message)
      return
    }
    return _require(this.cache[name])
  }

  fullReload(code = Loader.exitCode) {
    const body = JSON.stringify(this.envData)
    let didExit = false
    const doExit = () => {
      if (didExit) return
      didExit = true
      logger.info('trigger full reload')
      if (this.exitOnReload) {
        process.exit(code)
      } else {
        throw new FullReloadError(code)
      }
    }
    // Safety net: if the IPC channel is already closed or hangs (parent
    // process died, Node.js won't fire the callback), we still want to
    // actually restart instead of zombifying.
    const t = setTimeout(doExit, 500)
    if (t.unref) t.unref()
    if (typeof process.send === 'function') {
      try {
        process.send({ type: 'shared', body }, (err: any) => {
          clearTimeout(t)
          if (err) logger.error('failed to send shared data')
          doExit()
        })
      } catch {
        clearTimeout(t)
        doExit()
      }
    } else {
      clearTimeout(t)
      doExit()
    }
  }
}
