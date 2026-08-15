#!/usr/bin/env node
/**
 * spak-node-b CLI — build cache for plugin bundles.
 *
 *   spak-node-b <name> <entry.js...> [--root dir] [--outDir dist] [--force]
 *
 * Builds the given plugin package, records it in the whitelist, and skips
 * re-building it on subsequent runs unless `--force`.
 */
import { buildPackage } from '../lib/index.js'

function fail(msg) {
  console.error(`[node-b] ${msg}`)
  process.exit(1)
}

;async function main() {
  const args = process.argv.slice(2)
  const name = args[0]
  if (!name) fail('usage: spak-node-b <name> <entry.js...> [--root dir] [--outDir dist] [--force]')

  const entries = args.filter((a) => !a.startsWith('--') && a !== name)

  const opts = {}
  const flagMap = { '--root': 'root', '--outDir': 'outDir', '--whitelist': 'whitelistPath' }
  for (let i = 1; i < args.length; i++) {
    const key = flagMap[args[i]]
    if (key) opts[key] = args[i + 1]
  }
  const force = args.includes('--force')

  try {
    const r = await buildPackage(name, entries, { ...opts, force })
    console.log(`[node-b] ${r.message}`)
    process.exit(r.ok ? 0 : 1)
  } catch (e) {
    fail(e.message)
  }
}
void main()
