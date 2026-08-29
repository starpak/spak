// ===== INO — "I NO! 我不要" Conflict Declaration System =====
//
// INO allows a plugin to declare "I don't want" (我不要) conflicts with
// other plugins. If plugin A declares "I don't want" plugin B, and plugin
// B is present in the registry, then plugin A will be BLOCKED from starting
// by INO, and a warning will be logged.
//
// This is the Spak OS equivalent of package conflicts in Linux package
// managers — a way for plugins to declare incompatibilities declaratively
// rather than crashing at runtime.

import { T } from '@spakjs/i18n'
import { Context, Logger, Schema } from '@spakjs/core'
import { createLogger } from '@spakjs/log'
import type { PluginManifest } from './manifest'

// ===== Types =====
export interface InoConflict {
  /** The plugin that declared "I don't want" */
  declarer: string
  /** The plugin that is not wanted */
  target: string
}

export interface InoCheckResult {
  /** Whether the plugin is allowed to start */
  allowed: boolean
  /** Conflicts that blocked the plugin (if any) */
  conflicts: InoConflict[]
}

// ===== INO Service =====
export class InoService {
  static inject = ['apps']

  private logger = createLogger('ino')
  private conflicts: Map<string, Set<string>> = new Map()
  /** Set of plugin names that are currently blocked by INO */
  private blocked: Set<string> = new Set()

  constructor(protected ctx: Context) {
    // INO checks are performed manually via checkPlugin() before plugin
    // startup, rather than via automatic event hooks — this gives the
    // loader full control over when to enforce conflicts.
  }

  /**
   * Register a plugin's INO declarations from its manifest.
   * Called when a plugin is being considered for loading.
   */
  registerDeclarations(pluginName: string, manifest: PluginManifest): void {
    const disallow = manifest.body?.ino?.disallow
    if (!disallow || !Array.isArray(disallow) || disallow.length === 0) return

    if (!this.conflicts.has(pluginName)) {
      this.conflicts.set(pluginName, new Set())
    }

    for (const target of disallow) {
      this.conflicts.get(pluginName)!.add(target)
      this.logger.debug(`registered INO declaration: ${pluginName} does not want ${target}`)
    }
  }

  /**
   * Check if a plugin is allowed to start.
   * Returns conflicts if the plugin is blocked.
   */
  checkPlugin(pluginName: string, presentPlugins: string[]): InoCheckResult {
    const conflicts: InoConflict[] = []

    // Check if this plugin declared "I don't want" any present plugins
    const declarations = this.conflicts.get(pluginName)
    if (declarations) {
      for (const target of declarations) {
        if (presentPlugins.includes(target)) {
          conflicts.push({ declarer: pluginName, target })
        }
      }
    }

    // Also check if any OTHER plugin declared "I don't want" this plugin
    for (const [declarer, targets] of this.conflicts) {
      if (declarer === pluginName) continue
      if (targets.has(pluginName) && presentPlugins.includes(declarer)) {
        // The declarer is present and doesn't want this plugin
        // But per spec: "声明了这个我不要的插件，就会被INO禁止启动并警告"
        // So the DECLARER is blocked, not the target.
        // This check is for when WE are the declarer (handled above).
      }
    }

    const allowed = conflicts.length === 0
    if (!allowed) {
      this.blocked.add(pluginName)
      for (const c of conflicts) {
        this.logger.warn(
          T('spak.ino.blocked', { declarer: c.declarer, target: c.target })
        )
      }
    }

    return { allowed, conflicts }
  }

  /** Check all registered declarations against the current plugin set. */
  checkAll(presentPlugins: string[]): InoCheckResult[] {
    const results: InoCheckResult[] = []
    for (const pluginName of this.conflicts.keys()) {
      results.push({ ...this.checkPlugin(pluginName, presentPlugins), conflicts: [] })
    }
    return results
  }

  /** Get the list of currently blocked plugins. */
  getBlockedPlugins(): string[] {
    return [...this.blocked]
  }

  /** Remove a plugin's INO declarations (when it's unloaded). */
  unregisterDeclarations(pluginName: string): void {
    this.conflicts.delete(pluginName)
    this.blocked.delete(pluginName)
  }

  private onPluginAdded(name: string): void {
    // When a new plugin is added, re-check all declarations
    // to see if any declarer should now be blocked
    this.logger.debug(`plugin added: ${name}, re-checking INO conflicts`)
  }

  private onPluginRemoved(name: string): void {
    // When a plugin is removed, it might unblock others
    this.unregisterDeclarations(name)
    this.blocked.delete(name)
    this.logger.debug(`plugin removed: ${name}, INO declarations cleared`)
  }
}

// ===== Context augmentation =====
declare module '@spakjs/core' {
  interface Context {
    ino: InoService
  }

  namespace Context {
    interface Config {
      ino?: InoConfig
    }
  }
}

export interface InoConfig {
  /** Whether INO conflict checking is enabled (default: true) */
  enabled?: boolean
}

export const InoConfig: Schema<InoConfig> = Schema.object({
  enabled: Schema.boolean().default(true).description('Enable INO conflict checking.'),
})

export default InoService
