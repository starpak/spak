#!/usr/bin/env node
// ===== spm — Spak Package Manager CLI =====
//
// 内嵌于 spak 源码的专属包管理工具。
// 命令：
//   spm pack <appDir> [--out <file.pak>]   打包 app 目录 → .pak 单文件
//   spm version                             版本信息

import { join } from 'path'
import { cwd } from 'process'
import { packApp } from './pack'

function usage(): string {
  return [
    ``,
    `  spm — Spak Package Manager`,
    ``,
    `  Usage:  spm <command> [options]`,
    ``,
    `  Commands:`,
    `    pack <appDir>       pack an app directory into a .pak file`,
    `    version             show spm version`,
    ``,
    `  Options:`,
    `    --out <file>        output .pak path (default: ~/.spak/.apps/<name>.pak)`,
    `    -h, --help          display this message`,
    ``,
  ].join('\n')
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(usage())
    process.exit(0)
  }

  const cmd = args[0]

  if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
    console.log('spm/0.0.1')
    process.exit(0)
  }

  if (cmd === 'pack') {
    const appDir = args[1]
    if (!appDir) {
      console.error('error: spm pack requires an app directory')
      process.exit(1)
    }
    const outIdx = args.indexOf('--out')
    const out = outIdx >= 0 ? args[outIdx + 1] : undefined
    try {
      const target = packApp({ appDir, out })
      console.log(`✓ packed ${appDir} → ${target}`)
      process.exit(0)
    } catch (err) {
      console.error(`error: ${(err as Error).message}`)
      process.exit(1)
    }
  }

  console.error(`error: unknown command "${cmd}"`)
  console.log(usage())
  process.exit(1)
}

main()
