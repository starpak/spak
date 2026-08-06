import { Awaitable, camelize, Dict, isNullable, remove } from 'cosmokit'
import { coerce } from '@spakjs/util'
import { Logger, Schema } from 'cordis'
import { Fragment } from '../element'
import { Argv } from './parser'
import { Next, SessionError } from '../middleware'
import { Session } from '../session'
import { Context } from '../context'

const logger = new Logger('command')

export type Extend<O extends {}, K extends string, T> = {
  [P in K | keyof O]?: (P extends keyof O ? O[P] : unknown) & (P extends K ? T : unknown)
}

export namespace Command {
  export interface Alias {
    options?: Dict
    args?: string[]
    filter?: boolean
  }

  export type Action<A extends any[] = any[], O extends {} = {}>
    = (argv: Argv<A, O>, ...args: A) => Awaitable<void | Fragment>

  export type Usage = string | ((session: Session) => Awaitable<string>)
}

export class Command<
  A extends any[] = any[],
  O extends {} = {},
> extends Argv.CommandBase<Command.Config> {
  children: Command[] = []

  _parent: Command = null
  _aliases: Dict<Command.Alias> = Object.create(null)
  _examples: string[] = []
  _usage?: Command.Usage

  private _actions: Command.Action[] = []
  private _checkers: Command.Action[] = [async (argv) => {
    return this.ctx.serial(argv.session, 'command/before-execute', argv)
  }]

  constructor(name: string, decl: string, ctx: Context, config: Command.Config) {
    super(name, decl, ctx, {
      showWarning: true,
      handleError: true,
      ...config,
    })
    this._registerAlias(name)
    ctx.$commander._commandList.push(this)
  }

  get caller(): Context {
    return this[Context.current] || this.ctx
  }

  get displayName() {
    return Object.keys(this._aliases)[0]
  }

  set displayName(name) {
    this._registerAlias(name, true)
  }

  get parent() {
    return this._parent
  }

  set parent(parent: Command) {
    if (this._parent === parent) return
    if (this._parent) {
      remove(this._parent.children, this)
    }
    this._parent = parent
    if (parent) {
      parent.children.push(this)
    }
  }

  static normalize(name: string) {
    return name.toLowerCase().replace(/_/g, '-')
  }

  private _registerAlias(name: string, prepend = false, options: Command.Alias = {}) {
    name = Command.normalize(name)
    if (name.startsWith('.')) name = this.parent.name + name

    // check global
    const previous = this.ctx.$commander.get(name)
    if (previous && previous !== this) {
      throw new Error(`duplicate command names: "${name}"`)
    }

    // add to list
    const existing = this._aliases[name]
    if (existing) {
      if (prepend) {
        this._aliases = { [name]: existing, ...this._aliases }
      }
    } else if (prepend) {
      this._aliases = { [name]: options, ...this._aliases }
    } else {
      this._aliases[name] = options
    }
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Command <${this.name}>`
  }

  alias(...names: string[]): this
  alias(name: string, options: Command.Alias): this
  alias(...args: any[]) {
    if (typeof args[1] === 'object') {
      this._registerAlias(args[0], false, args[1])
    } else {
      for (const name of args) {
        this._registerAlias(name)
      }
    }
    this.caller.emit('command-updated', this)
    return this
  }

  _escape(source: any) {
    if (typeof source !== 'string') return source
    return source
      .replace(/\$\$/g, '@@__PLACEHOLDER__@@')
      .replace(/\$\d/g, s => `{${s[1]}}`)
      .replace(/@@__PLACEHOLDER__@@/g, '$')
  }

  subcommand<D extends string>(def: D, config?: Command.Config): Command<Argv.ArgumentType<D>>
  subcommand<D extends string>(def: D, desc: string, config?: Command.Config): Command<Argv.ArgumentType<D>>
  subcommand(def: string, ...args: any[]) {
    def = this.name + (def.charCodeAt(0) === 46 ? '' : '/') + def
    const desc = typeof args[0] === 'string' ? args.shift() as string : ''
    const config = args[0] as Command.Config || {}
    return this.ctx.command(def, desc, config)
  }

  usage(text: Command.Usage) {
    this._usage = text
    return this
  }

  example(example: string) {
    this._examples.push(example)
    return this
  }

  option(name: string, ...args: [Argv.OptionConfig?] | [string, Argv.OptionConfig?]) {
    let desc = ''
    if (typeof args[0] === 'string') {
      desc = args.shift() as string
    }
    const config = { ...args[0] as Argv.OptionConfig }
    this._createOption(name, desc, config)
    this.caller.emit('command-updated', this)
    this.caller.collect('option', () => this.removeOption(name))
    return this
  }

  match(session: Session) {
    return this.ctx.filter(session)
  }

  check(callback: Command.Action<A, O>, append = false) {
    return this.before(callback, append)
  }

  before(callback: Command.Action<A, O>, append = false) {
    if (append) {
      this._checkers.push(callback)
    } else {
      this._checkers.unshift(callback)
    }
    this.caller.scope.disposables?.push(() => remove(this._checkers, callback))
    return this
  }

  action(callback: Command.Action<A, O>, prepend = false) {
    if (prepend) {
      this._actions.unshift(callback)
    } else {
      this._actions.push(callback)
    }
    this.caller.scope.disposables?.push(() => remove(this._actions, callback))
    return this
  }

  async execute(argv: Argv<A, O>, fallback: Next = Next.compose): Promise<any> {
    argv.command ??= this
    argv.args ??= [] as any
    argv.options ??= {} as any

    const { args, options, error } = argv
    if (error) return error as any
    if (logger.level >= 3) logger.debug(argv.source ||= this.stringify(args, options))

    // before hooks
    for (const validator of this._checkers) {
      const result = await validator.call(this, argv, ...args)
      if (!isNullable(result)) return result
    }

    if (!this._actions.length) return '' as any

    let index = 0
    let callDepth = 0
    const maxCallDepth = Next.MAX_DEPTH
    const queue: any[] = this._actions.map(action => async () => {
      return await action.call(this, argv, ...args)
    })

    queue.push(fallback as any)
    const length = queue.length
    argv.next = async function (callback?: any): Promise<any> {
      if (++callDepth > maxCallDepth) {
        throw new Error(`command execution stack exceeded ${maxCallDepth}`)
      }
      if (callback !== undefined) {
        queue.push((next: any) => Next.compose(callback as any, next))
        if (queue.length > Next.MAX_DEPTH) {
          throw new Error(`middleware stack exceeded ${Next.MAX_DEPTH}`)
        }
      }
      return queue[index++]?.(argv.next)
    } as any

    try {
      const result = await argv.next()
      if (!isNullable(result)) return result
    } catch (error) {
      if (index === length) throw error
      if (error instanceof SessionError) {
        return argv.session.text(error.path, error.param) as any
      }
      const stack = coerce(error)
      logger.warn(`${argv.source ||= this.stringify(args, options)}\n${stack}`)
      this.ctx.emit(argv.session, 'command-error', argv, error)
      if (typeof this.config.handleError === 'function') {
        const result = await this.config.handleError(error, argv)
        if (!isNullable(result)) return result
      } else if (this.config.handleError) {
        return argv.session.text('internal.error-encountered') as any
      }
    }

    return '' as any
  }

  dispose() {
    this._disposables.splice(0).forEach(dispose => dispose())
    this.ctx.emit('command-removed', this)
    for (const cmd of this.children.slice()) {
      cmd.dispose()
    }
    remove(this.ctx.$commander._commandList, this)
    this.parent = null
  }
}

export namespace Command {
  export interface Config extends Argv.CommandBase.Config {
    captureQuote?: boolean
    /** disallow unknown options */
    checkUnknown?: boolean
    /** check argument count */
    checkArgCount?: boolean
    /** show command warnings */
    showWarning?: boolean
    /** handle error */
    handleError?: boolean | ((error: Error, argv: Argv) => Awaitable<void | Fragment>)
    /** permissions */
    permissions?: string[]
    /** dependencies */
    dependencies?: string[]
  }

  export const Config: Schema<Command.Config> = Schema.object({
    permissions: Schema.array(String).role('perms').default(['authority:1']).description('Permission inheritance.'),
    dependencies: Schema.array(String).role('perms').description('Permission dependencies.'),
    captureQuote: Schema.boolean().description('Whether to capture quoted text.').default(true).hidden(),
    checkUnknown: Schema.boolean().description('Whether to check for unknown options.').default(false).hidden(),
    checkArgCount: Schema.boolean().description('Whether to check argument count.').default(false).hidden(),
    showWarning: Schema.boolean().description('Whether to show warnings.').default(true).hidden(),
    handleError: Schema.union([Schema.boolean(), Schema.function()]).description('Whether to handle errors.').default(true).hidden(),
  })
}
