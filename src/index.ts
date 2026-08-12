// ===== Spak — unified facade entry point =====
//
// This package ("spak") is the monorepo root package published to npm.
// It re-exports the core public API AND includes the CLI directly (no
// separate @spakjs/cli package).
//
// Users can write:
//   import { Context, h, t, createApp, Loader } from 'spak'
//
// The CLI is available via `bin.js` at the package root.

export * from '@spakjs/core'
export * from '@spakjs/message'
export * from '@spakjs/util'
// Explicitly re-export from i18n to avoid conflicts with core's re-exports
// (core inlines LocaleTree/fallback; i18n also exports them → ambiguous).
export {
  loadYmlTranslation,
  init,
  t,
  T,
  setLanguage,
  getCurrentLanguage,
} from '@spakjs/i18n'
export type { LocaleTree } from '@spakjs/i18n'
// Re-export @spakjs/log explicitly (not `export *`) because both core (cordis)
// and @spakjs/log expose a class named `Logger`. Keeping core's cordis Logger as
// the default `Logger` preserves backward compatibility; @spakjs/log's logger
// class is exposed as `SpakLogger`. Prefer the `createLogger()` factory.
export {
  LogLevel,
  LEVEL_NAMES,
  Transport,
  ConsoleTransport,
  FileTransport,
  StreamTransport,
  createLogger,
  configureLogger,
  getLoggerConfig,
  attachCordis,
  defaultFormatter,
  colorFormatter,
  logStartup,
  logShutdown,
  Logger as SpakLogger,
} from '@spakjs/log'
export type { LogRecord, Formatter, FileTransportOptions, LoggerOptions, CordisAttachment, StartupOptions, ShutdownOptions } from '@spakjs/log'
export * as Config from '@spakjs/config'
export { default as Loader } from '@spakjs/loader'
export * from '@spakjs/loader'

// Convenience: also re-export CLI command helpers for plugin devs that want
// to register their own subcommands programmatically.
export type {
  CommandDeclaration,
  CommandArg,
  CommandOption,
} from '@spakjs/util'

import { Context } from '@spakjs/core'
import { init as initI18n, setLanguage } from '@spakjs/i18n'
import { logStartup } from '@spakjs/log'
import { version } from '../package.json'
// CPC module whitelist — enforced even for programmatic createApp() callers.
// Any unauthorized module under /packages or /plugins triggers process.exit(1)
// before the user's plugin code has a chance to run.
import { runModuleWhitelistCheck } from './commands/cpc'

export interface CreateAppOptions {
  /** Path to a spak.config.* file.  Absolute or relative to CWD. */
  config?: string
  /** Initial language override for the i18n system (e.g. 'zh', 'en'). */
  language?: string
  /** Shortcut: set `process.env.SPAK_HOST` / `SPAK_PORT` for plugin-server. */
  host?: string
  port?: string | number
  /** Extra env vars merged into process.env before loader init. */
  env?: Record<string, string>
}

/**
 * One-line convenience for most applications: read config, create the
 * application, wire i18n, optionally apply host/port overrides, and
 * return the ready-to-start Context.
 *
 * ```ts
 * import { createApp } from 'spak'
 * const app = await createApp({ language: 'zh', port: 5000 })
 * await app.start()
 * ```
 */
export async function createApp(options: CreateAppOptions = {}): Promise<Context> {
  const { config, language, host, port, env } = options
  if (env) Object.assign(process.env, env)
  if (host) process.env.SPAK_HOST = host
  if (port) process.env.SPAK_PORT = String(port)

  // =============================================================
  // HARD GUARD — CPC module whitelist (CLI + programmatic paths).
  // Unauthorized packages or plugins cause an immediate process.exit
  // inside runModuleWhitelistCheck. Run BEFORE any loader/user code.
  // =============================================================
  runModuleWhitelistCheck(true)

  // Normalize ESM / CJS / named-export shapes so that `new NodeLoader()` always
  // works regardless of how the loader module is bundled (mirrors start.ts).
  const mod: any = await import('@spakjs/loader')
  const NodeLoader = (mod as any).default?.default ?? (mod as any).default ?? (mod as any).NodeLoader ?? mod
  const loader = new (NodeLoader as any)()
  await loader.init(config)
  await loader.readConfig(true)

  if (language) setLanguage(language)

  const app = await loader.createApp()
  // wire the i18n helper so plugins can `import { T } from 'spak'` and get the
  // same instance core uses
  if (app.i18n) initI18n(app.i18n)

  // Emit startup banner via the log module (the single source of truth for output)
  logStartup({
    version,
    pid: process.pid,
    configPath: config,
    host,
    port,
  })

  return app
}

export default { createApp }
