import { distance } from 'fastest-levenshtein'
import { deduplicate, Dict, isNullable } from 'cosmokit'
import { Logger, Schema } from 'cordis'
import { h } from '@spakjs/message'
import { Context } from './context'

// ————— Inline LocaleTree + fallback algorithm (copied from @spakjs/i18n) —————
// This removes core → i18n runtime import which was causing a package graph
// cycle (@spakjs/core ↔ @spakjs/i18n).  Keeping the code in one place at the
// source-of-truth (@spakjs/i18n) is still the goal; core only inlines enough
// to bootstrap its own locale resolution without a Node-level dep.

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

// ————— Lazy embedded locales loader (Node-only; skipped in browser bundles) —————
// Core no longer executes filesystem reads at module-load time.  Instead the
// constructor probes for Node APIs on first use and populates the store.
// This keeps the core package Node-IO-free in the import graph (as required by
// MODULE_DIVISION.md §3) while preserving existing behaviour for Node runtimes.
let _embeddedLocales: Record<string, any> | null | undefined = undefined
function getEmbeddedLocales(): Record<string, any> {
  if (_embeddedLocales !== undefined) return _embeddedLocales || {}
  _embeddedLocales = null
  if (typeof require === 'undefined' || typeof process === 'undefined') return {}
  try {
    const fs: typeof import('fs') = require('fs')
    const path: typeof import('path') = require('path')
    const yaml: typeof import('js-yaml') = require('js-yaml')
    const dir = path.resolve(__dirname, './locales')
    const out: Record<string, any> = {}
    const files = fs.readdirSync(dir)
    for (const file of files) {
      if (path.extname(file) !== '.yml') continue
      const localeName = file.replace(/\.yml$/, '')
      const content = fs.readFileSync(path.resolve(dir, file), 'utf8')
      out[localeName] = yaml.load(content)
    }
    _embeddedLocales = out
  } catch {
    /* embedded locales directory missing or unavailable — ignore */
  }
  return _embeddedLocales || {}
}

const logger = new Logger('i18n')
const kTemplate = Symbol('template')

declare module './context' {
  interface Context {
    i18n: I18n
  }

  interface Events {
    'internal/i18n'(): void
  }
}

type GroupNames<P extends string, K extends string = never> =
  | P extends `${string}(${infer R})${infer S}`
  ? GroupNames<S, K | R>
  : K

export type MatchResult<P extends string = never> = Record<GroupNames<P>, string>

// Cache pattern → matcher to avoid recompiling the same regex hundreds of
// times (permissions store, i18n find loop, etc).
const matchCache = new Map<string, (string: string) => undefined | MatchResult>()

export function createMatch<P extends string>(pattern: P): (string: string) => undefined | MatchResult<P> {
  const cached = matchCache.get(pattern)
  if (cached) return cached as any

  const groups: string[] = []
  // Use `[^.]+` per group instead of `.+` to drastically reduce backtracking
  // when matching long strings with multiple consecutive groups (ReDoS guard).
  // If the pattern explicitly contains dots inside groups we still need a
  // catch-all, so we fall back to a non-greedy `.+?` only when a group name
  // itself contains a dot (which is unusual).
  const source = pattern.replace(/\(([^)]+)\)/g, (_, name: string) => {
    groups.push(name)
    return name.includes('.') ? '(.+?)' : '([^.]+)'
  })
  const regexp = new RegExp(`^${source}$`)
  const matcher = (string: string) => {
    const capture = regexp.exec(string)
    if (!capture) return
    const data: any = {}
    for (let i = 0; i < groups.length; i++) {
      data[groups[i]] = capture[i + 1]
    }
    return data
  }
  matchCache.set(pattern, matcher)
  return matcher as any
}

export interface CompareOptions {
  minSimilarity?: number
}

export namespace I18n {
  export type Node = string | Store

  export interface Store {
    [kTemplate]?: string
    [K: string]: Node
  }

  export type Formatter = (value: any, args: string[], locale: string) => string
  export type Renderer = (dict: Dict, params: any, locale: string) => string

  export interface FindOptions extends CompareOptions {}

  export interface FindResult<P extends string> {
    locale: string
    data: MatchResult<P>
    similarity: number
  }
}

export class I18n {
  _data: Dict<Dict<string>> = {}
  _presets: Dict<I18n.Renderer> = {}

  locales: LocaleTree

  constructor(public ctx: Context, config: I18n.Config) {
    this.locales = LocaleTree.from(config.locales ?? [])

    this.define('', { '': '' })
    for (const [locale, data] of Object.entries(getEmbeddedLocales())) {
      this.define(locale, data)
    }
  }

  fallback(locales: string[]) {
    return fallback(this.locales, locales)
  }

  compare(expect: string, actual: string, options: CompareOptions = {}) {
    if (!expect && !actual) return 1
    if (!expect || !actual) return 0
    const value = 1 - distance(expect, actual) / expect.length
    return value
  }

  get(key: string, locales: string[] = []): Dict<string> {
    const result: Dict<string> = {}
    for (const locale of this.fallback(locales)) {
      const value = this._data[locale]?.[key]
      if (value) result[locale] = value
    }
    return result
  }

  private* set(locale: string, prefix: string, value: I18n.Node): Generator<string> {
    if (typeof value === 'object' && value && !prefix.includes('@')) {
      for (const key in value) {
        if (key.startsWith('_')) continue
        yield* this.set(locale, prefix + key + '.', value[key])
      }
    } else if (prefix.includes('@')) {
      throw new Error('preset is deprecated')
    } else if (typeof value === 'string') {
      const dict = this._data[locale]
      const path = prefix.slice(0, -1)
      if (!isNullable(dict[path]) && !locale.startsWith('$') && dict[path] !== value) {
        logger.warn('override', locale, path)
      }
      dict[path] = value
      yield path
    } else {
      delete this._data[locale][prefix.slice(0, -1)]
    }
  }

  define(locale: string, dict: I18n.Store): () => void
  define(locale: string, key: string, value: I18n.Node): () => void
  define(locale: string, ...args: [I18n.Store] | [string, I18n.Node]) {
    const dict = this._data[locale] ||= {}
    const paths = [...typeof args[0] === 'string'
      ? this.set(locale, args[0] + '.', args[1]!)
      : this.set(locale, '', args[0])]
    this.ctx.emit('internal/i18n')
    return this.ctx.collect('i18n', () => {
      for (const path of paths) {
        delete dict[path]
      }
      this.ctx.emit('internal/i18n')
    })
  }

  find<P extends string>(pattern: P, actual: string, options: I18n.FindOptions = {}): I18n.FindResult<P>[] {
    if (!actual) return []
    const match = createMatch(pattern)
    const results: I18n.FindResult<P>[] = []
    for (const locale in this._data) {
      for (const path in this._data[locale]) {
        const data = match(path)
        if (!data) continue
        const expect = this._data[locale][path]
        if (typeof expect !== 'string') continue
        const similarity = this.compare(expect, actual, options)
        if (!similarity) continue
        results.push({ locale, data, similarity })
      }
    }
    return results
  }

  _render(value: I18n.Node, params: any, locale: string) {
    if (value === undefined) return

    if (typeof value !== 'string') {
      const preset = value[kTemplate]!
      const render = this._presets[preset]
      if (!render) throw new Error(`Preset "${preset}" not found`)
      return [h.text(render(value, params, locale))]
    }

    return h.parse(value, params)
  }

  /** @deprecated */
  text(locales: string[], paths: string[], params: object) {
    return (this.render(locales, paths, params) as any).join('')
  }

  render(locales: string[], paths: string[], params: object) {
    locales = this.fallback(locales)

    // try every locale
    for (const path of paths) {
      for (const locale of locales) {
        for (const key of ['$' + locale, locale]) {
          const value = this._data[key]?.[path]
          if (value === undefined || !value && !locale && path !== '') continue
          return this._render(value, params, locale)
        }
      }
    }

    // path not found
    logger.warn('missing', paths[0])
    return [h.text(paths[0])]
  }
}

export namespace I18n {
  export interface Config {
    locales?: string[]
  }

  export const Config: Schema<Config> = Schema.object({
    locales: Schema.array(String).role('table').default(['en-US']).description('Available locales in fallback order.'),
  }).description('Locale settings')
}
