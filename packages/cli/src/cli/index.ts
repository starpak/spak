import { cac } from 'cac'
import kleur from 'kleur'
// Force ANSI colors regardless of TTY detection, so the CLI stays colorized
// in real terminals (and is visible even when piped).
kleur.enabled = true
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { CommandDeclaration } from './types'
import { registerDeclarations, generateCommandHelp } from './registry'
import serveDeclarations from './start'
import configDeclarations from '../commands/config'
import cpcDeclarations from '../commands/cpc'
import { version } from '../../package.json'
import { T } from '@spakjs/i18n'
import { setGlobalFormatter, simpleFormatter, setDebugMode } from '@spakjs/log'

// Initialize CLI logger with simple formatter (normal mode)
setGlobalFormatter(simpleFormatter)

const cli = cac('spak').help().version(version)

// Collect all package command declarations
const declarations: CommandDeclaration[] = [
  ...serveDeclarations,
  ...configDeclarations,
  ...cpcDeclarations,
]

registerDeclarations(cli, declarations)

// Intercept --help for subcommands before cac parses them
// Extract full subcommand path from argv (e.g. 'config list', 'cpc check')
const helpIndex = process.argv.findIndex(a => a === '--help' || a === '-h')
if (helpIndex > 0) {
  // Collect all args before --help that aren't flags
  const subArgs: string[] = []
  for (let i = 2; i < helpIndex; i++) {
    const arg = process.argv[i]
    if (!arg.startsWith('-')) subArgs.push(arg)
  }
  if (subArgs.length > 0) {
    const fullPath = subArgs.join(' ')
    const help = generateCommandHelp(fullPath, declarations) || generateCommandHelp(subArgs[0], declarations)
    if (help) {
      console.log(help)
      process.exit(0)
    }
  }
}

// Version shortcut: spak -v / spak --version should print ONLY the version
// line and exit (before cac gets a chance to print its own banner + help).
const hasVersionFlag = process.argv.slice(2).some(a => a === '-v' || a === '--version')
if (hasVersionFlag) {
  const platform = `${process.platform} ${process.arch}`
  // Colorized version banner: spak name bright cyan + bold, version green,
  // platform yellow (higher contrast than gray).
  console.log(
    `${kleur.bold().cyan('spak')}/${kleur.green(version)} ${kleur.yellow(platform)} node-${process.version}`
  )
  process.exit(0)
}

const argv = cli.parse()

// Friendly banner when spak is run without any command (instead of raw help).
if (!cli.matchedCommand && !argv.options.help) {
  const gotFlags = process.argv.slice(2).some(a => a.startsWith('-'))
  if (!gotFlags) {
    // Check if there are unknown positional args (i.e. an unrecognized command)
    const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('-'))
    if (positionalArgs.length > 0) {
      // Unknown command — show error, not the banner
      console.error(kleur.red(`spak: ${T('spak.cli.unknown_command', { cmd: positionalArgs[0] })}`))
      console.error(kleur.dim(`  ${T('spak.cli.try_help')}`))
      process.exit(1)
    }
    const banner = `  ${kleur.bold().cyan('spak')} v${kleur.green(version)} · ${T('spak.intro.description')}`
    console.log(banner)
    process.exit(0)
  }
  cli.outputHelp()
}
