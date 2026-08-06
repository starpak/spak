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
import { T } from '@spakjs/i18n'

function usage(): string {
  return T('spm.usage')
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(usage())
    process.exit(0)
  }

  const cmd = args[0]

  if (cmd === 'version' || cmd === '-v' || cmd === '--version') {
    console.log(T('spm.version'))
    process.exit(0)
  }

  if (cmd === 'pack') {
    const appDir = args[1]
    if (!appDir) {
      console.error(T('spm.pack_requires_dir'))
      process.exit(1)
    }
    const outIdx = args.indexOf('--out')
    const out = outIdx >= 0 ? args[outIdx + 1] : undefined
    try {
      const target = packApp({ appDir, out })
      console.log(T('spm.packed', { appDir, target }))
      process.exit(0)
    } catch (err) {
      console.error(T('spm.pack_error', { error: (err as Error).message }))
      process.exit(1)
    }
  }

  console.error(T('spm.unknown_command', { cmd }))
  console.log(usage())
  process.exit(1)
}

main()
