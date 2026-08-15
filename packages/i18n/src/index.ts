// ===== @spakjs/i18n — unified I18n utilities for Spak =====
//
// Merges two previous packages:
//   @spakjs/i18n-utils  → LocaleTree, fallback
//   @spakjs/locales     → init, t, T, setLanguage, getCurrentLanguage,
//                          loadYmlTranslation (internal) + default object
//
// Why merge? Because the two were tightly coupled (i18n-utils depended on
// locales via package.json despite not importing it in source) and their
// conceptual surface is very small.  One package is easier for users.

// ———————————————————————————————————————————————————————————————————————
// From: @spakjs/i18n-utils (LocaleTree + fallback algorithm)
// ———————————————————————————————————————————————————————————————————————
import { deduplicate } from 'cosmokit'

export type LocaleTree = { [key in string]: LocaleTree }

export namespace LocaleTree {
  export function from(locales: string[]) {
    const tree: LocaleTree = {}
    for (const locale of locales.filter(Boolean)) {
      const tokens = locale.split('-')
      let current = tree
      for (let i = 0; i < tokens.length; i++) {
        const locale = tokens.slice(0, i + 1).join('-')
        current = current[locale] = current[locale] || {}
      }
    }
    return tree
  }
}

type LocaleEntry = readonly [string, LocaleEntry[]]

function toLocaleEntry(key: string, tree: LocaleTree): LocaleEntry {
  return [key, [[key, []], ...Object.entries(tree).map(([key, value]) => toLocaleEntry(key, value))]]
}

function* traverse([key, children]: LocaleEntry, ignored: LocaleEntry[]): Generator<string> {
  if (!children.length) {
    return yield key
  }
  for (const child of children) {
    if (ignored.includes(child)) continue
    yield* traverse(child, ignored)
  }
}

export function fallback(tree: LocaleTree, locales: string[]): string[] {
  const root = toLocaleEntry('', tree)
  const ignored: LocaleEntry[] = []
  for (const locale of deduplicate(locales).filter(Boolean).reverse()) {
    let prefix = '', children = root[1]
    const tokens = locale ? locale.split('-') : []
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!
      const current = prefix + token
      const index = children.findIndex(([key]) => key === current)
      if (index < 0) break
      const entry = children[index]
      if (index > 0) {
        children.splice(index, 1)
        children.unshift(entry)
      }
      children = entry[1]
      prefix = current + '-'
      if (current === locale) {
        ignored.unshift(entry)
      }
    }
  }
  ignored.push(root)
  const results: string[] = []
  for (const entry of ignored) {
    results.push(...traverse(entry, ignored))
  }
  return results
}

// ———————————————————————————————————————————————————————————————————————
// From: @spakjs/locales (translation loader + T() helper)
// ———————————————————————————————————————————————————————————————————————
import type { I18n } from '@spakjs/core'
import { getConfig, setConfig } from '@spakjs/config'
import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { resolve } from 'path'
import { load } from 'js-yaml'

let _i18n: I18n | null = null

// Fallback cache: manually loaded from yml files when i18n is not available
const fallbackCache: Record<string, Record<string, string>> = {}

/**
 * Flatten a nested object (produced by loading .yml) into dot-notation flat
 * keys, e.g. `{ spak: { cli: { serve: { started: "..." } } } }` becomes
 * `{ "spak.cli.serve.started": "..." }`. This matches the dotted keys used by
 * T()/t().
 */
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

export function loadYmlTranslation(lang: string, rootDir: string = process.cwd()): Record<string, string> {
  if (fallbackCache[lang]) return fallbackCache[lang]

  const allMessages: Record<string, string> = {}

  // Build a list of candidate root directories to search for locale files.
  // Unified structure: translations live in the project-level /locales dir.
  // We still scan legacy locations (src/locales, per-package locales) for
  // backward compatibility, but the authoritative source is /locales/*.yml.
  const i18nDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd()
  const candidateRoots = new Set<string>([
    rootDir,
    resolve(i18nDir, '..', '..', '..'), // monorepo root: packages/i18n/lib → root
    resolve(i18nDir, '..', '..'),       // packages/i18n → packages/ → root (one less level)
    resolve(i18nDir, '..'),              // packages/i18n/lib → packages/i18n
  ])
  // Also check SPAK_ROOT env var for explicit override
  if (process.env.SPAK_ROOT) candidateRoots.add(process.env.SPAK_ROOT)

  // Loader that reads a single locales directory and merges the flattened
  // messages (lang-specific file picked first, lang-prefixed as fallback).
  const loadDir = (localesDir: string) => {
    if (!existsSync(localesDir)) return
    let existing: string[] = []
    try { existing = readdirSync(localesDir).filter(f => f.endsWith('.yml')) } catch { return }
    const exact = `${lang}.yml`
    const prefixMatch = existing.filter(f => f.startsWith(`${lang}-`) && f !== exact).sort()
    const ordered = [exact, ...prefixMatch]
    for (const fileName of ordered) {
      const ymlFile = resolve(localesDir, fileName)
      if (!existsSync(ymlFile)) continue
      try {
        const content = readFileSync(ymlFile, 'utf-8')
        const parsed = load(content)
        if (parsed) Object.assign(allMessages, flattenKeys(parsed))
        break
      } catch (err) {
        if (process.env.SPAK_DEBUG) console.debug('[i18n] skip yml:', ymlFile, (err as any)?.message ?? String(err))
      }
    }
  }

  // Search each candidate root for locale files.
  // Priority (highest first): /locales (project-level unified) → src/locales → lib/locales → per-package locales.
  for (const cRoot of candidateRoots) {
    // 1) Project-level unified locales directory (PRIMARY / AUTHORITATIVE).
    loadDir(resolve(cRoot, 'locales'))
    loadDir(resolve(cRoot, 'lib', 'locales')) // published package copies /locales into lib/locales as well

    // 2) Legacy: project root src/locales and lib/locales (for back-compat).
    loadDir(resolve(cRoot, 'src/locales'))
    loadDir(resolve(cRoot, 'lib/locales'))

    // 3) Legacy: per-package / per-plugin locales dirs.
    for (const subDir of ['packages', 'plugins']) {
      const dir = resolve(cRoot, subDir)
      if (!existsSync(dir)) continue
      let entries: string[] = []
      try { entries = readdirSync(dir).filter(d => statSync(resolve(dir, d)).isDirectory()) } catch { continue }
      for (const entry of entries) {
        loadDir(resolve(dir, entry, 'locales'))
        loadDir(resolve(dir, entry, 'src', 'locales'))
      }
    }
  }

  fallbackCache[lang] = allMessages
  return allMessages
}

/** Register the i18n instance from core. */
export function init(i18n: I18n) {
  _i18n = i18n
}

function resolveParams(message: string, params?: Record<string, string | number>): string {
  if (!params) return message
  for (const [k, v] of Object.entries(params)) {
    const escapedK = String(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    message = message.replace(new RegExp(`\\{${escapedK}\\}`, 'g'), String(v).replace(/\$/g, '$$$$'))
  }
  return message
}

/**
 * Translate a key using the core i18n system.
 * Falls back to direct yml file loading when core is not available.
 * Falls back to `<key> (missing)` if the key is not found, so callers can
 * tell a missing translation apart from a successful lookup.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = getConfig('language') || 'en'

  // Try core i18n first, but fall through to yml if the key isn't found
  if (_i18n) {
    const result = _i18n.render([lang], [key], params || {}) as any
    const text = result.map((e: any) => (e && (e as any).type === 'text') ? ((e as any).attrs?.content ?? (e as any).children?.[0] ?? '') : String(e)).join('')
    if (text && text !== key) return text
    // Fall through to yml fallback instead of returning the raw key
  }

  const messages = loadYmlTranslation(lang)
  let message = messages[key]

  if (!message && lang !== 'en') {
    const enMessages = loadYmlTranslation('en')
    message = enMessages[key]
  }

  if (!message) return `${key} (missing)`
  return resolveParams(message, params)
}

/** Alias for `t()`. */
export function T(key: string, params?: Record<string, string | number>): string {
  return t(key, params)
}

export function setLanguage(lang: string): boolean {
  setConfig('language', lang)
  return true
}

export function getCurrentLanguage(): string {
  return getConfig('language') || 'en'
}

export default { init, t, T, setLanguage, getCurrentLanguage, loadYmlTranslation }
