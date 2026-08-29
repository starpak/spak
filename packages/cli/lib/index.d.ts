import { Context } from '@spakjs/core';
import { version } from './version';
export type { CommandDeclaration, CommandArg, CommandOption } from './cli/types';
export { registerDeclarations, generateCommandHelp } from './cli/registry';
export { default as serveDeclarations } from './cli/start';
export { default as configDeclarations } from './commands/config';
export { default as cpcDeclarations } from './commands/cpc';
export { runSandboxWorker } from './commands/cpc';
export { default as i18nDeclarations } from './commands/i18n';
export { version };
export interface CreateAppOptions {
    /** Path to a spak.config.* file. Absolute or relative to CWD. */
    config?: string;
    /** Initial language override for the i18n system (e.g. 'zh', 'en'). */
    language?: string;
    /** Shortcut: set `process.env.SPAK_HOST` / `SPAK_PORT` for server plugins. */
    host?: string;
    port?: string | number;
    /** Extra env vars merged into process.env before loader init. */
    env?: Record<string, string>;
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
export declare function createApp(options?: CreateAppOptions): Promise<Context>;
//# sourceMappingURL=index.d.ts.map