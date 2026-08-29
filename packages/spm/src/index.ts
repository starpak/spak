#!/usr/bin/env node
// ===== spm — Spak Package Manager CLI =====
//
// spm 是 Spak 的专属 CLI：包管理（pack/list/info/install/uninstall/publish）、
// 应用管理（i18n init/check）、运行时启停（serve/stop/restart/kill/status）。
// 命令实现位于 @spakjs/cli（构建时注入），spm 负责壳编排与包管理命令。

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

const cli = cac('spm').help().version(spmVersion)

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

// spm -v prints only the version line (spm + spak runtime)
const hasVersionFlag = process.argv.slice(2).some(a => a === '-v' || a === '--version')
if (hasVersionFlag) {
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