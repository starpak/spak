// ===== SPAK sealed binary boot loader =====
//
// Runtime entry of a spm build artifact, bundled into the SEA single file:
//   1. Register embedded translations (locales collected at build time;
//      a sealed binary has no yml files on disk)
//   2. Detect the sandbox worker flag (--spak-sandbox) → run the worker
//   3. Load the embedded APP entry; with no CLI args and an exported main,
//      execute the APP directly
//   4. Otherwise fall through to the full spak runtime command surface
//      (serve/config/cpc/i18n)
//
// spak-internal:locales / spak-internal:app-entry are two virtual modules
// generated at build time by the spm esbuild plugins.

import { loadEmbeddedTranslations } from '@spakjs/i18n'
import embeddedLexicons from 'spak-internal:locales'

// 1) Embedded translations — registered first so any runtime T() hits.
// Note: yml filenames may be en-US/zh-CN while the runtime default language
// is en/zh — also inject the prefix language (en-US → en), matching the
// runtime prefixMatch compatibility logic.
for (const [lang, flat] of Object.entries(embeddedLexicons)) {
  loadEmbeddedTranslations(lang, flat)
  const prefix = lang.split('-')[0]
  if (prefix && prefix !== lang) loadEmbeddedTranslations(prefix, flat)
}

// 2) Sandbox worker branch (SEA re-executes itself: spawn(self, ['--spak-sandbox', name]))
if (process.argv[2] === '--spak-sandbox') {
  const { runSandboxWorker } = require('@spakjs/cli')
  runSandboxWorker(process.argv[3] || '')
} else {
  // 3+4) Main process: APP takes precedence, framework commands otherwise.
  // Runtime require (not a top-level import) so translations are registered
  // first and the APP runs in the expected order.
  const appEntry = require('spak-internal:app-entry')
  const starter = (appEntry && (typeof appEntry.main === 'function' ? appEntry.main : undefined))
    || (appEntry && typeof appEntry === 'function' ? appEntry : appEntry?.default)

  const args = process.argv.slice(2)
  const FRAMEWORK_CMDS = new Set(['serve', 'config', 'cpc', 'i18n', 'test', 'init-locales'])
  const helpLike = args.length === 1 && ['-h', '--help', '-v', '--version'].includes(args[0])
  const wantsFramework = args.length > 0 && (helpLike || FRAMEWORK_CMDS.has(args[0]))

  if (typeof starter === 'function' && !wantsFramework) {
    try {
      // APP mode: no args → main(); with args → main(args) passed through
      const ret = args.length ? starter(args) : starter()
      // Keep the process alive when main returns a promise (APP-managed lifecycle)
      if (ret && typeof ret.then === 'function') {
        ret.catch((err: any) => {
          console.error('[app]', err)
          process.exit(1)
        })
      }
    } catch (err) {
      console.error('[app]', err)
      process.exit(1)
    }
  } else if (args.length === 0 && typeof starter !== 'function') {
    console.error('[app] entry does not export a main function, and no framework command was given.')
    process.exit(1)
  } else {
    // Framework command (serve/config/cpc/i18n ...) → command surface
    require('@spakjs/cli/cli')
  }
}