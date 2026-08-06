import { Awaitable, isNullable } from 'cosmokit'
import { Logger } from 'cordis'
import { Fragment, h } from '@spakjs/message'
import { Argv } from './command'
import { Context } from './context'
import { Next } from './middleware'

const logger = new Logger('session')

export interface Session<C extends Context = Context> {
  argv?: Argv
  scope?: string
  execute(content: string | Argv, next?: true | Next): Promise<Fragment>
  text(path: string | string[], params?: object): string
}

export default class SpakSession<C extends Context> {
  constructor(public ctx: C) {
    ctx.mixin(this, {
      execute: 'session.execute',
    })
  }

  async execute(argv: string | Argv, next?: true | Next) {
    if (typeof argv === 'string') argv = Argv.parse(argv)

    argv.session = this as any
    if (argv.tokens) {
      for (const arg of argv.tokens) {
        const { inters } = arg
        const output: string[] = []
        for (let i = 0; i < inters.length; ++i) {
          const execution = await this.execute(inters[i], true)
          output.push(h.normalize(execution).join(''))
        }
        for (let i = inters.length - 1; i >= 0; --i) {
          const { pos } = inters[i]
          arg.content = arg.content.slice(0, pos) + output[i] + arg.content.slice(pos)
        }
        arg.inters = []
      }
      if (!this.ctx.$commander.resolveCommand(argv)) return []
    } else {
      argv.command ||= this.ctx.$commander.get(argv.name)
      if (!argv.command) {
        logger.warn(new Error(`cannot find command ${argv.name}`))
        return []
      }
    }

    const { command } = argv
    if (!command.ctx.filter(this as any)) return []

    let shouldEmit = true
    if (next === true) {
      shouldEmit = false
      next = undefined as Next
    }

    const result = await command.execute(argv as Argv, next as Next)
    if (!shouldEmit) return h.normalize(result)
    return result
  }
}
