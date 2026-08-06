import { defineProperty, Promisify, Time } from 'cosmokit'
import { Schema } from 'cordis'
import { GetEvents, Parameters, ReturnType, ThisType } from 'cordis'
import * as cordis from 'cordis'
import { Computed, FilterService } from './filter'
import { Commander, Command } from './command'
import { I18n } from './i18n'
import { Processor } from './middleware'
import { Permissions } from './permission'
import { SchemaService } from './schema'

export type EffectScope = cordis.EffectScope<Context>
export type ForkScope = cordis.ForkScope<Context>
export type MainScope = cordis.MainScope<Context>

export { Logger, Schema } from 'cordis'
export { h, Fragment } from '@spakjs/message'

export { resolveConfig } from 'cordis'

export type { Disposable, ScopeStatus, Plugin } from 'cordis'

declare module 'cordis' {
  namespace Plugin {
    interface Object {
      filter?: boolean
    }
  }
}

export interface EnvData {}

type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never
type BeforeEventName = OmitSubstring<keyof Events & string, 'before-'>
type BeforeEventMap = { [E in keyof Events & string as OmitSubstring<E, 'before-'>]: Events[E] }

export interface Events<C extends Context = Context> extends cordis.Events<C> {}

export interface Context {
  [Context.events]: Events<this>
  spak: Spak
  $processor: Processor
  $filter: FilterService
  $commander: Commander
}

export class Context extends cordis.Context {
  static shadow = Symbol.for('session.shadow')

  constructor(config: Context.Config = {}) {
    super(config)
    this.mixin('$processor' as any, ['match', 'middleware'] as any)
    this.mixin('$filter' as any, [
      'any', 'never', 'union', 'intersect', 'exclude',
    ] as any)
    this.mixin('$commander' as any, ['command'] as any)
    this.provide('$filter', new FilterService(this), true)
    this.provide('schema', new SchemaService(this), true)
    this.provide('$processor', new Processor(this), true)
    this.provide('i18n', new I18n(this, this.config.i18n), true)
    this.provide('permissions', new Permissions(this), true)
    this.provide('$commander', new Commander(this, this.config), true)
    this.plugin(Spak, this.config)
  }

  /** @deprecated use `ctx.root` instead */
  get app() {
    return this.root
  }

  /* eslint-disable max-len */
  /** @deprecated */
  waterfall<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>
  waterfall<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>
  async waterfall(...args: [any, ...any[]]) {
    const thisArg = typeof args[0] === 'object' || typeof args[0] === 'function' ? args.shift() : null
    const name = args.shift()
    for (const hook of this.lifecycle.filterHooks(this.lifecycle._hooks[name] || [], thisArg)) {
      const result = await hook.callback.apply(thisArg, args)
      args[0] = result
    }
    return args[0]
  }

  /** @deprecated */
  chain<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>
  chain<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>
  chain(...args: [any, ...any[]]) {
    const thisArg = typeof args[0] === 'object' || typeof args[0] === 'function' ? args.shift() : null
    const name = args.shift()
    for (const hook of this.lifecycle.filterHooks(this.lifecycle._hooks[name] || [], thisArg)) {
      const result = hook.callback.apply(thisArg, args)
      args[0] = result
    }
    return args[0]
  }
  /* eslint-enable max-len */

  before<K extends BeforeEventName>(name: K, listener: BeforeEventMap[K], append = false) {
    const seg = (name as string).split('/')
    seg[seg.length - 1] = 'before-' + seg[seg.length - 1]
    return this.on(seg.join('/') as any, listener, !append)
  }
}

export default class Spak extends cordis.Service<Context.Config, Context> {
  constructor(ctx: Context, public config: Context.Config) {
    super(ctx, 'spak', true)
  }
}

export namespace Context {
  export interface Config extends Config.Basic, Config.Advanced {
    i18n?: I18n.Config
    /** Log module configuration — all modules default to having log access. */
    log?: Config.Log
  }

  export const Config = Schema.intersect([
    Schema.object({}),
  ]) as Config.Static

  export namespace Config {
    export interface Basic extends Commander.Config {
      /** Default user authority level used by the built-in permission matcher. */
      defaultAuthority?: number
      /**
       * Maximum depth for the middleware / command execution stack.
       * Exceeding this throws to prevent runaway recursion from buggy
       * plugins. Mirrors {@link Next.MAX_DEPTH} and is the single source
       * of truth going forward.
       */
      middlewareMaxDepth?: number
      /**
       * Default locale for the i18n renderer (fallback when the session
       * does not specify one). Example: 'zh', 'en-US', 'ja'.
       * All modules default to having locales (i18n) access.
       */
      locale?: string
    }

    export interface Advanced {
      maxListeners?: number
    }

    /**
     * Log module configuration.
     * All modules/plugins default to having log access — this config
     * controls the global log level and output destinations.
     */
    export interface Log {
      /** Log level: 0=silent, 1=error, 2=warn, 3=info, 4=debug, 5=trace */
      level?: number
      /** Log file path (when running in daemon mode) */
      file?: string
      /** Show timestamps in log output */
      showTime?: boolean
    }

    export interface Static extends Schema<Config> {
      Basic: Schema<Basic>
      I18n: Schema<I18n>
      Log: Schema<Log>
      Advanced: Schema<Advanced>
    }
  }
}

defineProperty(Context.Config, 'Basic', Schema.object({
  defaultAuthority: Schema.natural().min(0).max(9999).default(1)
    .description('Default user authority level used by the permission matcher.'),
  middlewareMaxDepth: Schema.natural().min(8).max(1024).default(64)
    .description('Maximum middleware/command call depth. Exceeding throws to stop runaway recursion.'),
  locale: Schema.string()
    .description("Default i18n locale override (e.g. 'zh', 'en'). Falls back to @spakjs/config if unset."),
}).description('Basic settings'))

defineProperty(Context.Config, 'I18n', I18n.Config)

defineProperty(Context.Config, 'Log', Schema.object({
  level: Schema.natural().min(0).max(5).default(3)
    .description('Log level: 0=silent, 1=error, 2=warn, 3=info, 4=debug, 5=trace.'),
  file: Schema.string()
    .description('Log file path for daemon mode.'),
  showTime: Schema.boolean().default(true)
    .description('Show timestamps in log output.'),
}).description('Log settings (all modules default to having log access)'))

defineProperty(Context.Config, 'Advanced', Schema.object({
  maxListeners: Schema.natural().default(64).description('Maximum number of listeners per type. Exceeding this is considered a memory leak.'),
}).description('Advanced settings'))

Context.Config.list.push(Context.Config.Basic)
Context.Config.list.push(Schema.object({
  i18n: I18n.Config,
}))
Context.Config.list.push(Schema.object({
  log: Context.Config.Log,
}))
Context.Config.list.push(Context.Config.Advanced)

export abstract class Service<T = any, C extends Context = Context> extends cordis.Service<T, C> {
  [cordis.Service.setup]() {
    this.ctx = new Context() as C
  }
}

// for backward compatibility
export { Context as App }

export function defineConfig(config: Context.Config) {
  return config
}
