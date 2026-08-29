// ===== spm/commands.ts — spm-specific commands (builder) =====
//
// spm is Spak's dedicated builder CLI. This file implements spm's own
// command declarations:
//   build / dev / version
// The runtime commands (serve/config/cpc/i18n) come from @spakjs/cli and
// are injected by the spm shell.
//
// The .pak single-file package system was dropped in builder 2.0 — the
// install/publish/audit responsibilities moved upstream (source audit +
// permission validation happen at build time, then get embedded).

import kleur from 'kleur'
import { T } from '@spakjs/i18n'
import { CommandDeclaration } from '@spakjs/cli'
import { version as spmVersion } from '../package.json'
import { buildApp } from './build'
import { runDev } from './dev'

// ---------- declarations ----------

export const spmDeclarations: CommandDeclaration[] = [
  {
    command: 'build',
    description: 'Build a closed self-contained binary (framework + embedded APP, SEA single file)',
    action: async () => {
      // ===== Full argv self-parsing (short/long flags) =====
      //   spm build -i <app> [-n <name>] [-v <version>] [-o <dir>]
      //   spm build <app> ... (positional fallback)
      // Deliberately avoids cac option registration: short flags like
      // -i/-n/-v get swallowed by the global -v/unknown-flag handling in
      // the cac/registry system, so reading process.argv directly is safest.
      const argv = process.argv.slice(2)
      const parsed: Record<string, string> = {}
      for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        const peek = () => (i + 1 < argv.length && !argv[i + 1].startsWith('-') ? argv[++i] : '')
        if (a === '-i' || a === '--input') parsed.input = peek()
        else if (a === '-n' || a === '--name') parsed.name = peek()
        else if (a === '-v' || a === '--version') parsed.version = peek()
        else if (a === '-o' || a === '--out-dir' || a === '--outDir') parsed.outDir = peek()
        else if (!a.startsWith('-')) parsed.input = parsed.input || a
      }

      if (!parsed.input) {
        console.error(kleur.red(T('spak.spm.build_requires_input')))
        process.exit(1)
      }
      try {
        const result = await buildApp({
          input: parsed.input,
          name: parsed.name,
          version: parsed.version,
          outDir: parsed.outDir,
        })
        const sizeMB = (result.sizeBytes / 1024 / 1024).toFixed(1)
        console.log(kleur.green(T('spak.spm.build_success', {
          name: result.name,
          version: result.version,
          output: result.output,
        })))
        console.log(kleur.dim(`  ${T('spak.spm.build_size', { size: sizeMB })}`))
      } catch (err) {
        console.error(kleur.red(T('spak.spm.build_error', { error: (err as Error).message })))
        process.exit(1)
      }
    },
  },
  {
    command: 'dev',
    description: 'Dev mode: watch + HMR hot restart (--no-hmr does a full SEA rebuild)',
    action: async () => {
      // Full argv self-parsing (same style as build)
      const argv = process.argv.slice(2)
      const parsed: Record<string, string> = {}
      let noHmr = false
      for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        const peek = () => (i + 1 < argv.length && !argv[i + 1].startsWith('-') ? argv[++i] : '')
        if (a === '-i' || a === '--input') parsed.input = peek()
        else if (a === '-n' || a === '--name') parsed.name = peek()
        else if (a === '-v' || a === '--version') parsed.version = peek()
        else if (a === '-o' || a === '--out-dir' || a === '--outDir') parsed.outDir = peek()
        else if (a === '--no-hmr') noHmr = true
        else if (!a.startsWith('-')) parsed.input = parsed.input || a
      }

      if (!parsed.input) {
        console.error(kleur.red(T('spak.spm.build_requires_input')))
        process.exit(1)
      }
      try {
        await runDev({
          input: parsed.input,
          name: parsed.name,
          version: parsed.version,
          outDir: parsed.outDir,
          noHmr,
        })
      } catch (err) {
        console.error(kleur.red(T('spak.spm.build_error', { error: (err as Error).message })))
        process.exit(1)
      }
    },
  },
  {
    command: 'version',
    description: 'Show spm and spak runtime versions',
    action: async () => {
      const platform = `${process.platform} ${process.arch}`
      const spakVersion = require('@spakjs/cli/package.json').version
      console.log(kleur.bold().cyan('spm') + '/' + kleur.green(spmVersion) + ' ' + kleur.yellow(platform))
      console.log(kleur.bold().cyan('spak') + '/' + kleur.green(spakVersion) + ' ' + kleur.yellow(platform) + ' node-' + process.version)
    },
  },
]

export default spmDeclarations