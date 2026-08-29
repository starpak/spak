// ===== @spakjs/cli — command declarations + createApp bootstrap =====
//
// The spak CLI (serve / config / cpc) and the one-line application bootstrap
// (createApp) live here, OUTSIDE @spakjs/core. core stays a pure kernel (no
// i18n / output / config footprint); this package binds core to the Node
// runtime and drives the cac CLI.

import { Context } from '@spakjs/core'
import { init as initI18n, setLanguage } from '@spakjs/i18n'
import { logStartup } from '@spakjs/log'
import { runModuleWhitelistCheck } from './commands/cpc'
import { version } from './version'

export type { CommandDeclaration, CommandArg, CommandOption } from './cli/types'
export { registerDeclarations, generateCommandHelp } from './cli/registry'
export { default as serveDeclarations } from './cli/start'
export { default as configDeclarations } from './commands/config'
export { default as cpcDeclarations } from './commands/cpc'
export { runSandboxWorker } from './commands/cpc'
export { default as i18nDeclarations } from './commands/i18n'
export { version }

export interface CreateAppOptions {
  /** Path to a spak.config.* file. Absolute or relative to CWD. */
  config?: string
  /** Initial language override for the i18n system (e.g. 'zh', 'en'). */
  language?: string
  /** Shortcut: set `process.env.SPAK_HOST` / `SPAK_PORT` for server plugins. */
  host?: string
  port?: string | number
  /** Extra env vars merged into process.env before loader init. */
  env?: Record<string, string>
}

/**
 * One-line convenience for most applications: read config, create the
 * application, wire i18n, optionally apply host/port overrides, and return
 * the ready-to-start Context.
 *
 * ```ts
 * import { createApp } from '@spakjs/cli'
 * const app = await createApp({ language: 'zh', port: 5000 })
 * await app.start()
 * ```
 */
export async function createApp(options: CreateAppOptions = {}): Promise<Context> {
  const { config, language, host, port, env } = options
  if (env) Object.assign(process.env, env)
  if (host) process.env.SPAK_HOST = host
  if (port) process.env.SPAK_PORT = String(port)

  // CPC module whitelist — enforced even for programmatic createApp() callers.
  runModuleWhitelistCheck(true)

  // Normalize ESM / CJS / named-export shapes so `new NodeLoader()` works.
  const mod: any = await import('@spakjs/loader')
  const NodeLoader = (mod as any).default?.default ?? (mod as any).default ?? (mod as any).NodeLoader ?? mod
  const loader = new (NodeLoader as any)()
  await loader.init(config)
  await loader.readConfig(true)

  if (language) setLanguage(language)

  const app = await loader.createApp()
  if (app.i18n) initI18n(app.i18n)

  logStartup({ version, pid: process.pid, configPath: config, host, port })

  return app
}
