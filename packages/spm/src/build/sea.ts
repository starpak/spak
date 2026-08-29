// ===== spm build — SEA (Single Executable Application) sealing =====
//
// Turns the esbuild-bundled single CJS file into a real Node SEA binary:
//   1. Write sea-config.json
//   2. node --experimental-sea-config → blob
//   3. Copy process.execPath (the node binary) as the artifact skeleton
//   4. postject-inject the NODE_SEA_BLOB
//   5. chmod +x
//
// The artifact is a platform-specific native executable (Linux for now):
// single file, no Node runtime needed, runs directly on same-arch Linux.

import { execFileSync } from 'child_process'
import { copyFileSync, chmodSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { resolve } from 'path'

const SEA_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'

export interface SeaOptions {
  /** esbuild bundle output (single CJS file) */
  bundlePath: string
  /** Final binary output path */
  outputPath: string
}

/** Seal the bundle into a single executable; returns the final binary path. */
export async function sealToBinary(opts: SeaOptions): Promise<string> {
  const dir = resolve(opts.outputPath, '..')
  const seaConfig = resolve(dir, '.sea-config.json')
  const blobPath = resolve(dir, '.sea.blob')

  writeFileSync(
    seaConfig,
    JSON.stringify({
      main: opts.bundlePath,
      output: blobPath,
      disableExperimentalSEAWarning: true,
      useCodeCache: true,
    }, null, 2),
  )

  execFileSync(process.execPath, ['--experimental-sea-config', seaConfig], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  // Copy the node binary as the executable skeleton
  copyFileSync(process.execPath, opts.outputPath)

  // postject-inject the blob (pure JS API, no subprocess)
  const { inject } = await import('postject')
  await inject(opts.outputPath, 'NODE_SEA_BLOB', readFileSync(blobPath), {
    sentinelFuse: SEA_FUSE,
  })

  chmodSync(opts.outputPath, 0o755)

  // Clean up temp files
  try { rmSync(seaConfig, { force: true }) } catch { /* ignore */ }
  try { rmSync(blobPath, { force: true }) } catch { /* ignore */ }

  return opts.outputPath
}