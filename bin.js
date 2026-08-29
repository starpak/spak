#!/usr/bin/env node
// ===== spak binary — 运行时身份 =====
//
// spak 已转型为纯运行时（v1.0.0）：所有 CLI 命令（serve/config/cpc/i18n/
// 包管理/启停）统一由 spm 提供。spak 仅保留版本响应（-v/--version），
// 其余输入一律引导用户使用 spm。

const pkg = require('./package.json')

if (process.argv.includes('-v') || process.argv.includes('--version')) {
  const platform = `${process.platform} ${process.arch}`
  console.log(`spak/${pkg.version} ${platform} node-${process.version} · runtime`)
  process.exit(0)
}

console.error('spak 已转为纯运行时，CLI 命令请使用 spm（spm serve / spm config / spm cpc / spm i18n 等）')
console.error('试试: spm -h')
process.exit(1)