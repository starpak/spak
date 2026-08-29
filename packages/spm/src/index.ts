#!/usr/bin/env node
// ===== spm — Spak Builder CLI =====
//
// spm is Spak's dedicated CLI: sealed-binary building (build/dev),
// i18n management (i18n init/check), and runtime control
// (serve/stop/restart/kill/status). Command implementations live in
// @spakjs/cli (injected at build time); spm owns the shell orchestration
// and the builder commands.

import { cac } from 'cac'
import kleur from 'kleur'
kleur.enabled = true
import { CommandDeclaration, registerDeclarations, generateCommandHelp } from '@spakjs/cli'
import {
  serveDeclarations,
  configDeclarations,
  cpcDeclarations,
  i18nDeclarations,
} from '@spakjs/cli'
import { version as spmVersion } from '../package.json'
import { T } from '@spakjs/i18n'
import { setGlobalFormatter, simpleFormatter } from '@spakjs/log'
import { spmDeclarations } from './commands'

// CLI logger: simple formatter
setGlobalFormatter(simpleFormatter)

const cli = cac('spm').help()

const declarations: CommandDeclaration[] = [
  ...serveDeclarations,
  ...configDeclarations,
  ...cpcDeclarations,
  ...i18nDeclarations,
  ...spmDeclarations,
]

registerDeclarations(cli, declarations)

// Intercept --help for subcommands before cac parses them
const helpIndex = process.argv.findIndex(a => a === '--help' || a === '-h')
if (helpIndex > 0) {
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

// spm -v prints only the version line (spm + spak runtime).
// NOTE: only effective in a non-child-command context — a subcommand's -v
// is a business option (e.g. build -v <version>) and must not be intercepted.
const firstPositional = process.argv.slice(2).find(a => !a.startsWith('-'))
const topLevelCommands = new Set(declarations.map(d => d.command.split(' ')[0]))
const isChildContext = !!firstPositional && topLevelCommands.has(firstPositional)
const hasVersionFlag = process.argv.slice(2).some(a => a === '-v' || a === '--version')
if (!isChildContext && hasVersionFlag) {
  const platform = `${process.platform} ${process.arch}`
  const spakVersion = require('@spakjs/cli/package.json').version
  console.log(`${kleur.bold().cyan('spm')}/${kleur.green(spmVersion)} ${kleur.yellow(platform)} node-${process.version}`)
  console.log(`${kleur.bold().cyan('spak')}/${kleur.green(spakVersion)} ${kleur.yellow(platform)} runtime`)
  process.exit(0)
}

const argv = cli.parse()

// Friendly banner when spm is run without any command
if (!cli.matchedCommand && !argv.options.help) {
  const gotFlags = process.argv.slice(2).some(a => a.startsWith('-'))
  if (!gotFlags) {
    const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('-'))
    if (positionalArgs.length > 0) {
      console.error(kleur.red(`spm: ${T('spak.cli.unknown_command', { cmd: positionalArgs[0] })}`))
      console.error(kleur.dim(`  ${T('spak.cli.try_help')}`))
      process.exit(1)
    }
    const banner = `  ${kleur.bold().cyan('spm')} v${kleur.green(spmVersion)} · ${T('spak.spm.intro')}`
    console.log(banner)
    process.exit(0)
  }
  cli.outputHelp()
}