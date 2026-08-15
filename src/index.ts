// ===== Spak — facade entry point =====
//
// This package ("spak") is the published entry. It is a PURE re-export shell:
// it carries no CLI or bootstrap glue (those now live in @spakjs/cli) and no
// kernel logic (that lives in @spakjs/core). It only re-exports the public
// surface so users can write `import { Context, h, t, createApp, Loader } from 'spak'`.

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

// Convenience: re-export CLI command declaration helpers.
export type { CommandDeclaration, CommandArg, CommandOption } from '@spakjs/cli'
export type { CreateAppOptions } from '@spakjs/cli'

// createApp is hosted by @spakjs/cli; re-export for backward compatibility so
// `import { createApp } from 'spak'` keeps working.
export { createApp } from '@spakjs/cli'
