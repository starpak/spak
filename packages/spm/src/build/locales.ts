// ===== spm build — locales collection & flattening =====
//
// A sealed binary has no locales/*.yml files on disk (single-file), so at
// build time all translations are collected, flattened and embedded into
// the binary's boot loader.
//
// Precedence: per-package locales (packages/*/locales) are lowest priority,
// the root /locales (authoritative source) wins — matching the runtime
// search order of @spakjs/i18n's loadYmlTranslation.

import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { resolve } from 'path'
import { load } from 'js-yaml'

/** Flatten a nested object into dot-notation keys (same as i18n's flattenKeys). */
function flattenKeys(obj: any, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        flattenKeys(v, key, out)
      } else if (typeof v === 'string') {
        out[key] = v
      }
    }
  }
  return out
}

function loadLocaleDir(localesDir: string, out: Record<string, Record<string, string>>): void {
  if (!existsSync(localesDir)) return
  let entries: string[] = []
  try {
    entries = readdirSync(localesDir).filter(f => f.endsWith('.yml'))
  } catch {
    return
  }
  for (const file of entries) {
    const lang = file.replace(/\.yml$/, '')
    try {
      const parsed = load(readFileSync(resolve(localesDir, file), 'utf-8'))
      if (parsed && typeof parsed === 'object') {
        const flat = flattenKeys(parsed)
        out[lang] = { ...(out[lang] || {}), ...flat }
      }
    } catch {
      // Skip broken yml, keep building
    }
  }
}

/**
 * Collect all translations (one flattened map per language).
 * Scans the project root plus every package.
 */
export function collectLocales(projectRoot: string): Record<string, Record<string, string>> {
  const all: Record<string, Record<string, string>> = {}

  // 1) per-package locales (low priority)
  const packagesDir = resolve(projectRoot, 'packages')
  if (existsSync(packagesDir)) {
    let pkgs: string[] = []
    try {
      pkgs = readdirSync(packagesDir).filter(d => {
        try { return statSync(resolve(packagesDir, d)).isDirectory() } catch { return false }
      })
    } catch {
      pkgs = []
    }
    for (const pkg of pkgs) {
      loadLocaleDir(resolve(packagesDir, pkg, 'locales'), all)
    }
  }

  // 2) root /locales (authoritative; loaded last = highest priority)
  loadLocaleDir(resolve(projectRoot, 'locales'), all)

  return all
}