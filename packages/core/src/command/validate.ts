import { isNullable } from 'cosmokit'
import { Context } from '../context'
import { Argv } from './parser'

export default function validate(ctx: Context) {
  ctx.permissions.define('command:(name)', {
    depends: ({ name }) => {
      const command = ctx.$commander.get(name)
      if (!command) return
      const depends = [...command.config.dependencies ?? []]
      if (command.parent) depends.push(`command:${command.parent.name}`)
      return depends
    },
    inherits: ({ name }) => {
      return ctx.$commander.get(name)?.config.permissions
    },
    list: () => {
      return ctx.$commander._commandList.map(command => `command:${command.name}`)
    },
  })

  ctx.permissions.define('command:(name):option:(name2)', {
    depends: ({ name, name2 }) => {
      return ctx.$commander.get(name)?._options[name2]?.dependencies
    },
    inherits: ({ name, name2 }) => {
      return ctx.$commander.get(name)?._options[name2]?.permissions
    },
    list: () => {
      return ctx.$commander._commandList.flatMap(command => {
        return Object.keys(command._options).map(name => `command:${command.name}:option:${name}`)
      })
    },
  })

  // check argv
  ctx.before('command/execute', async (argv: Argv) => {
    const { args, options, command } = argv
    function sendHint(message: string, ...param: any[]): any {
      return command!.config.showWarning ? message : ''
    }

    // check argument count
    if (command!.config.checkArgCount) {
      let index = args!.length
      while (command!._arguments[index]?.required) {
        const decl = command!._arguments[index]
        index++
      }
      const finalArg = command!._arguments[command!._arguments.length - 1] || {}
      if (args!.length > command!._arguments.length && !finalArg.variadic) {
        return sendHint('internal.redunant-arguments')
      }
    }

    // check unknown options
    if (command!.config.checkUnknown) {
      const unknown = Object.keys(options!).filter(key => !command!._options[key])
      if (unknown.length) {
        return sendHint('internal.unknown-option', unknown.join(', '))
      }
    }
  }, true)
}
