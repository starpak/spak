import { CAC } from 'cac'
import { CommandDeclaration } from './types'
import { T } from '@spakjs/i18n'

/** Localize a description for help output based on the current language. */
function l10n(desc: string): string {
  if (!desc) return desc
  // For help text, we use T() with a convention: spak.cli.help.<slug>
  // where slug is the lowercased description with non-alphanumerics folded
  // into single underscores. If no translation is found, T() returns the
  // key itself (or a "(missing)" marker), so we fall back to the original
  // description (which may itself be English or Chinese).
  const slug = desc.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  const key = `spak.cli.help.${slug}`
  const translated = T(key)
  if (translated === key || translated.endsWith('(missing)')) return desc
  return translated
}

/**
 * Register all commands as flat commands (does not support cac nested subcommands).
 * Uses allowUnknownOptions + manual matching to support subcommand routing.
 */

/** Exposed for index.ts to generate help text early */
export function generateCommandHelp(rootName: string, declarations: CommandDeclaration[]): string {
  const rootDecl = declarations.find(d => d.command === rootName)
  const children = declarations.filter(d => d.command.startsWith(rootName + ' ') && d.command !== rootName)
  return generateHelp(rootName, rootDecl, children)
}

/** Generate help text for subcommands */
function generateHelp(rootName: string, rootDecl: CommandDeclaration | undefined, children: CommandDeclaration[]): string {
  // When the root command itself has options (e.g. `serve` with --port/--host),
  // it is a functional leaf command — show its own usage/args/options first,
  // and list subcommands as a supplement below. Only fall back to a pure
  // subcommand listing when the root has no options of its own.
  if (children.length > 0 && !rootDecl?.options?.length) {
    let text = `\nUsage:\n  $ spak ${rootName} <command>\n\nCommands:\n`
    for (const child of children) {
      const parts = child.command.split(' ').slice(1)
      const usage = parts.map(p => {
        if (p.startsWith('<')) return p
        if (p.startsWith('[')) return p
        return p
      }).join(' ')
      const display = `${rootName} ${usage}`
      const padding = display.length > 28 ? 1 : 28 - display.length
      text += `  ${display}${' '.repeat(padding)}${l10n(child.description)}\n`
    }
    text += `\nOptions:\n  -h, --help  Display this message\n`
    return text
  }

  if (rootDecl) {
    // Has args/options, so it is a leaf command; or just a description-only command
    let text = `\nUsage:\n  $ spak ${rootName}`
    if (rootDecl.args) {
      for (const arg of rootDecl.args) {
        text += arg.required ? ` <${arg.name}>` : ` [${arg.name}]`
      }
    }
    text += '\n'
    if (rootDecl.description) text += `\n${l10n(rootDecl.description)}\n`
    if (rootDecl.args?.length) {
      text += '\nArguments:\n'
      for (const arg of rootDecl.args) {
        text += `  ${arg.name}${' '.repeat(Math.max(1, 20 - arg.name.length))}${l10n(arg.description)}\n`
      }
    }
    if (rootDecl.options?.length) {
      text += '\nOptions:\n'
      for (const opt of rootDecl.options) {
        text += `  --${opt.name}${' '.repeat(Math.max(1, 20 - opt.name.length))}${l10n(opt.description)}`
        if (opt.default) text += ` (default: ${opt.default})`
        text += '\n'
      }
      text += '  -h, --help                Display this message\n'
    } else {
      text += '\nOptions:\n  -h, --help                Display this message\n'
    }
    // Append subcommands (if any) as a supplement for leaf commands that
    // also have children (e.g. `serve` + `serve status`).
    if (children.length > 0) {
      text += '\nSubcommands:\n'
      for (const child of children) {
        const parts = child.command.split(' ').slice(1)
        const usage = parts.join(' ')
        const display = `${rootName} ${usage}`
        const padding = display.length > 28 ? 1 : 28 - display.length
        text += `  ${display}${' '.repeat(padding)}${l10n(child.description)}\n`
      }
    }
    return text
  }

  return ''
}

export function registerDeclarations(cli: CAC, declarations: CommandDeclaration[]) {
  // Collect root commands (each top-level command has one entry)
  const rootCmdNames = new Set<string>()
  for (const decl of declarations) {
    const root = decl.command.split(' ')[0]
    rootCmdNames.add(root)
  }

  // Pre-generate help text mapping
  const helpTexts = new Map<string, string>()
  for (const rootName of rootCmdNames) {
    const rootDecl = declarations.find(d => d.command === rootName)
    const children = declarations.filter(d => d.command.startsWith(rootName + ' ') && d.command !== rootName)
    helpTexts.set(rootName, generateHelp(rootName, rootDecl, children))
  }

  for (const rootName of rootCmdNames) {
    const rootDecl = declarations.find(d => d.command === rootName)
    const children = declarations.filter(d => d.command.startsWith(rootName + ' ') && d.command !== rootName)
    const helpText = helpTexts.get(rootName) || ''

    const cmd = cli.command(rootName, l10n(rootDecl?.description || ''))
    cmd.allowUnknownOptions()

    // Register options
    const allOptions = new Map<string, string>()
    for (const decl of [rootDecl, ...children].filter(Boolean)) {
      if (decl?.options) {
        for (const opt of decl.options) {
          if (!allOptions.has(opt.name)) {
            allOptions.set(opt.name, opt.description)
            cmd.option(`--${opt.name} [${opt.name}]`, opt.description)
          }
        }
      }
    }

    cmd.action((...args: any[]) => {
      // cac puts options as the last arg, positional args come before
      const rawOpts = args[args.length - 1] || {}
      const options = rawOpts?.options || rawOpts
      const positional: string[] = args.slice(0, -1).filter((a: any) => typeof a === 'string')

      // Extract subcommand from process.argv
      const argv = process.argv
      const rootIdx = argv.indexOf(rootName)
      // Positional extraction: skip flags and their following values.
      const rest = rootIdx >= 0 ? argv.slice(rootIdx + 1) : []
      const subArgs: string[] = []
      for (let i = 0; i < rest.length; i++) {
        const a = rest[i]
        if (a.startsWith('-')) {
          // skip the option value if the next token is not a flag
          if (i + 1 < rest.length && !rest[i + 1].startsWith('-')) i++
          continue
        }
        subArgs.push(a)
      }
      const subCmd = subArgs.join(' ')

      // Handle --help
      const helpFlags = ['--help', '-h']
      const hasHelp = argv.slice(rootIdx + 1).some(a => helpFlags.includes(a))
      if (hasHelp || (subArgs.length === 0 && children.length > 0 && !rootDecl?.args?.length)) {
        console.log(helpText)
        return
      }

      // Find matching command declaration (longest match first)
      let matchedDecl: CommandDeclaration | undefined
      let matchedLen = 0
      for (const decl of declarations) {
        const parts = decl.command.split(' ')
        if (parts[0] !== rootName) continue
        if (parts.length === 1) continue // Root command, fallback later
        // Check if it matches the subcommand path
        const subParts = parts.slice(1)
        let match = true
        for (let i = 0; i < subParts.length; i++) {
          // If argument placeholder (<xxx> or [xxx]), match any value
          if (subParts[i].startsWith('<') || subParts[i].startsWith('[')) continue
          if (subParts[i] !== subArgs[i]) { match = false; break }
        }
        if (match && parts.length > matchedLen) {
          matchedDecl = decl
          matchedLen = parts.length
        }
      }

      // If no subcommand matched, fall back to root command
      if (!matchedDecl) matchedDecl = rootDecl
      if (!matchedDecl) return

      // Extract named arguments from declaration's args array
      // subArgs includes subcommand tokens (e.g. ['set', 'language', 'en']),
      // so skip the subcommand word count to get to actual argument values
      const namedArgs: Record<string, string> = {}
      if (matchedDecl.args) {
        const declParts = matchedDecl.command.split(' ')
        const subCmdWordCount = declParts.length - 1  // number of subcommand words
        for (let i = 0; i < matchedDecl.args.length; i++) {
          const arg = matchedDecl.args[i]
          namedArgs[arg.name] = subArgs[subCmdWordCount + i] || ''
        }
      }

      matchedDecl.action(namedArgs, options)
    })
  }
}
