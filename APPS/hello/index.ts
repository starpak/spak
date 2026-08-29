// ===== APPS/hello — sample app for the SPAK sealed binary =====
//
// The entry is declared by the master field of spak.manifest.json (index.ts).
// At build time spm bundles this project together with the framework runtime
// (@spakjs/*) into a single-file binary; this file only imports a framework
// package directly to prove that @spakjs/apps capabilities ship inside the
// binary.

import { createSampleManifest, validateManifest, normalizeAppPermissions } from '@spakjs/apps'

export function main() {
  console.log('Hello from SPAK binary! 🐱')

  // @spakjs/apps — manifest / permissions validation (pure functions, usable in-binary)
  const manifest = createSampleManifest('hello')
  const result = validateManifest(manifest)
  const perms = normalizeAppPermissions({ network: 'all', fs: 'read' })

  console.log(`[apps] manifest ${manifest.header.name} -> valid=${result.valid}`)
  console.log(`[apps] permissions -> network=${perms.network} fs=${perms.fs} childProcess=${perms.childProcess}`)
  console.log('pid=' + process.pid)
}