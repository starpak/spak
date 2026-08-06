import { escapeRegExp } from '@spakjs/util'

// ===== VDOM-like message element tree =====
// Decoupled from core for reuse by CLI, plugin tooling and browser bundles
// that only need message formatting without pulling in the full runtime.

/**
 * A message fragment (a list of child elements with no wrapper tag).
 * Its string form is a flat concatenation of its children.
 */
export class Fragment<A extends {} = any> {
  constructor(public readonly attrs: A, public readonly children: any[]) {}

  toString(): string {
    return this.children.join('')
  }

  // Array-like convenience methods (delegate to children) — keeps Fragment
  // API drop-in compatible with code that treats it as a plain array of
  // elements (used heavily in @spakjs/core command parser / i18n renderer).
  get length(): number { return this.children.length }

  map<U>(cb: (el: any, i: number, arr: any[]) => U): U[] {
    return this.children.map(cb)
  }

  forEach(cb: (el: any, i: number, arr: any[]) => void): void {
    this.children.forEach(cb)
  }

  join(separator = ''): string {
    return this.children.join(separator)
  }

  filter(pred: (el: any, i: number, arr: any[]) => boolean): any[] {
    return this.children.filter(pred)
  }

  reduce<U>(cb: (acc: U, el: any, i: number) => U, initial: U): U {
    return this.children.reduce(cb, initial)
  }

  [Symbol.iterator](): Iterator<any> {
    return this.children[Symbol.iterator]()
  }
}

/** Recursively escape XML text content: `& < > " '`  */
export function escape(source: unknown, whitespace = true): string {
  if (source === null || source === undefined) return ''
  if (Array.isArray(source)) return source.map(child => escape(child, whitespace)).join('')
  if (typeof source === 'string') {
    let result = source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    if (whitespace) result = result.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    return result
  }
  if (source instanceof Fragment || source instanceof h) return source.toString()
  return String(source)
}

/** Unescape XML/HTML entities in text content (both named, decimal, hex). */
export function unescape(source: string): string {
  return source.replace(/&([^;]+);/g, (match, name: string) => {
    switch (name) {
      case 'amp':  return '&'
      case 'lt':   return '<'
      case 'gt':   return '>'
      case 'quot': return '"'
      case '#39':  return "'"
      default: {
        const pos = 0
        // numeric entity
        if (name.startsWith('#x')) {
          const code = parseInt(name.slice(2), 16)
          if (Number.isFinite(code) && Number.isInteger(code) && code >= 0) {
            return String.fromCodePoint(code) || '�'
          }
          return '�'
        }
        if (name[0] === '#') {
          const code = parseInt(name.slice(1), 10)
          if (Number.isFinite(code) && Number.isInteger(code) && code >= 0) {
            return String.fromCodePoint(code) || '�'
          }
          return '�'
        }
        // fallback: leave as-is
        return match
      }
    }
  })
}

const ATTR_ESCAPE_RE = /[&<>"]/g
function attrEscape(v: string): string {
  return v.replace(ATTR_ESCAPE_RE, c =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'
  )
}

/**
 * Hyperscript-like element factory: `h(type, attrs?, ...children)`
 *
 * - `h.text(str)` / `h.parse(str)` / `h.normalize(...)` helpers
 * - Works side-by-side with the `Fragment` class for plain lists.
 */
export class h<T extends string = any, A extends {} = any> {
  public type: T
  public attrs: A
  public children: any[]

  constructor(type: T, attrs?: A | any[], ...children: any[]) {
    if (Array.isArray(attrs)) {
      this.attrs = {} as A
      children = attrs.concat(children)
    } else {
      this.attrs = (attrs || {}) as A
    }
    this.type = type
    this.children = children
  }

  toString(): string {
    const head = `<${this.type}`
    const attrs = Object.keys(this.attrs || {})
    let attrsStr = ''
    for (const key of attrs) {
      const v = (this.attrs as any)[key]
      if (v === undefined || v === null) continue
      if (v === false) continue
      if (v === true) {
        attrsStr += ` ${key}`
      } else {
        attrsStr += ` ${key}="${attrEscape(String(v))}"`
      }
    }
    const rendered = this.children.length ? `${head}${attrsStr}>${this.children.join('')}</${this.type}>` : `${head}${attrsStr}/>`
    return rendered
  }

  /** Extract `[type, attrs, children]` tuple for inspection. */
  valueOf(): [T, A, any[]] {
    return [this.type, this.attrs, this.children]
  }

  // ===== Static helpers =====

  /** Safely wrap a plain string as a "text element" (just the string itself). */
  static text(content: any): string {
    return content == null ? '' : String(content)
  }

  /** Escape XML special characters. Shorthand for the top-level `escape()` helper. */
  static escape = escape

  /** Unescape XML entities. Shorthand for the top-level `unescape()` helper. */
  static unescape = unescape

  /**
   * Parse an XML-ish string into a tree of `h` / `Fragment` / string
   * elements.  Designed to round-trip with `.toString()` for the subset
   * of tags that Spak uses (at, img, quote, text, br, p, i18n...).
   *
   * An optional `params` record is accepted for call-site compatibility
   * with `@spakjs/core`'s i18n renderer; when provided the parameter
   * placeholders `{name}` are substituted into the source string *before*
   * parsing (same order as `@spakjs/i18n`'s interpolation helper).
   */
  static parse(source: string, params?: Record<string, any>): Fragment {
    if (params && typeof params === 'object' && Object.keys(params).length) {
      for (const [k, v] of Object.entries(params)) {
        const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        source = source.replace(new RegExp(`\\{${escapedK}\\}`, 'g'), String(v ?? ''))
      }
    }
    let pos = 0
    const len = source.length
    const rootChildren: any[] = []

    // Protection against deeply nested input causing stack overflow.
    const MAX_RECURSION_DEPTH = 128
    let recursionDepth = 0

    const textBuffer: string[] = []
    function flushText() {
      if (textBuffer.length) {
        const s = textBuffer.join('')
        if (s) rootChildren.push(s)
        textBuffer.length = 0
      }
    }

    // ----- inner entity decode (consumes from `source[pos..]`, expects leading `&`) -----
    function consumeEntity(innerBuf?: string[]): string {
      // pos is at '&'
      if (source.startsWith('amp;',  pos + 1)) { pos += 5; return '&' }
      if (source.startsWith('lt;',   pos + 1)) { pos += 4; return '<' }
      if (source.startsWith('gt;',   pos + 1)) { pos += 4; return '>' }
      if (source.startsWith('quot;', pos + 1)) { pos += 6; return '"' }
      if (source.startsWith('#39;',  pos + 1)) { pos += 5; return "'" }
      // numeric entity
      if (source.startsWith('#x', pos + 1)) {
        const end = source.indexOf(';', pos + 3)
        if (end > pos + 3) {
          const code = parseInt(source.slice(pos + 3, end), 16)
          pos = end + 1
          if (Number.isFinite(code) && Number.isInteger(code) && code >= 0) {
            return String.fromCodePoint(code) || '�'
          }
          return '�'
        }
      }
      if (source[pos + 1] === '#') {
        const end = source.indexOf(';', pos + 2)
        if (end > pos + 2) {
          const code = parseInt(source.slice(pos + 2, end), 10)
          pos = end + 1
          if (Number.isFinite(code) && Number.isInteger(code) && code >= 0) {
            return String.fromCodePoint(code) || '�'
          }
          return '�'
        }
      }
      // fallback: leave as-is (no-op — just advance and return literal '&')
      void innerBuf
      pos += 1
      return '&'
    }

    function consumeText(stopAt: (ch: string) => boolean): string {
      const out: string[] = []
      while (pos < len) {
        const ch = source[pos]
        if (stopAt(ch)) break
        if (ch === '&') {
          out.push(consumeEntity(out))
          continue
        }
        out.push(ch)
        pos++
      }
      return out.join('')
    }

    // parse opening tag from current position; returns element or null
    function parseTag(): h | boolean | null {
      // Guard: bail out before nesting gets too deep to blow the V8 stack
      if (recursionDepth >= MAX_RECURSION_DEPTH) {
        // Treat everything remaining as flat text — advance to end and push a text node upstream
        const rest = source.slice(pos)
        pos = len
        return rest as unknown as h // caller will detect non-h/false/null and handle
      }

      recursionDepth += 1
      try {
        // pos at '<'
        if (source.startsWith('</', pos)) {
          // closing tag – return false (handled by caller stack)
          const end = source.indexOf('>', pos + 2)
          if (end < 0) { pos = len; return null }
          pos = end + 1
          return false
        }
        if (source.startsWith('<!--', pos)) {
          const end = source.indexOf('-->', pos + 4)
          if (end < 0) { pos = len; return null }
          pos = end + 3
          return null
        }
        // tag name
        pos += 1 // skip '<'
        let tagName = ''
        while (pos < len) {
          const c = source[pos]
          if (/[\s/>]/.test(c)) break
          tagName += c
          pos++
        }
        if (!tagName) { pos++; return null }

        // attrs
        const attrs: Record<string, any> = {}
        while (pos < len) {
          while (pos < len && /\s/.test(source[pos])) pos++
          if (source[pos] === '>' || source.startsWith('/>', pos)) break
          // attr name
          let name = ''
          while (pos < len && !/[\s=/>]/.test(source[pos])) { name += source[pos]; pos++ }
          if (!name) break
          // optional value
          let value: any = true
          if (source[pos] === '=') {
            pos++ // skip '='
            const quote = source[pos]
            if (quote === '"' || quote === "'") {
              pos++
              const val: string[] = []
              while (pos < len && source[pos] !== quote) {
                if (source[pos] === '&') val.push(consumeEntity(val))
                else { val.push(source[pos]); pos++ }
              }
              pos++ // skip closing quote
              value = val.join('')
            } else {
              const val: string[] = []
              while (pos < len && !/[\s>]/.test(source[pos])) {
                if (source[pos] === '&') val.push(consumeEntity(val))
                else { val.push(source[pos]); pos++ }
              }
              value = val.join('')
            }
          }
          attrs[name] = value
        }
        let selfClosing = false
        if (source.startsWith('/>', pos)) { pos += 2; selfClosing = true }
        else if (source[pos] === '>') { pos += 1 }

        if (selfClosing) {
          return new h(tagName as any, attrs as any)
        }

        // collect children until matching close tag
        const children: any[] = []
        const innerTextBuf: string[] = []
        function flushInner() {
          if (innerTextBuf.length) {
            const s = innerTextBuf.join('')
            if (s) children.push(s)
            innerTextBuf.length = 0
          }
        }

        const voidTags = new Set(['br', 'img', 'hr', 'input'])
        if (voidTags.has(tagName)) {
          return new h(tagName as any, attrs as any)
        }

        while (pos < len) {
          const c = source[pos]
          if (c === '<') {
            if (source.startsWith(`</${tagName}`, pos)) {
              // found closing tag for us
              const end = source.indexOf('>', pos + 2)
              if (end > 0) {
                pos = end + 1
                break
              }
            }
            flushInner()
            const sub = parseTag()
            if (sub === false) {
              // unexpected close tag for someone else – close ourselves too (unbalanced)
              break
            } else if (sub === null) {
              // comment / error skip
            } else if (!(sub instanceof h)) {
              // Depth guard returned a string — push as text and stop further descent
              children.push(String(sub))
              break
            } else {
              children.push(sub)
            }
          } else if (c === '&') {
            innerTextBuf.push(consumeEntity(innerTextBuf))
          } else {
            innerTextBuf.push(c)
            pos++
          }
        }
        flushInner()
        return new h(tagName as any, attrs as any, ...children)
      } finally {
        recursionDepth -= 1
      }
    }

    while (pos < len) {
      const c = source[pos]
      if (c === '<') {
        flushText()
        const tag = parseTag()
        if (tag instanceof h) rootChildren.push(tag as any)
        else if (typeof tag === 'string') rootChildren.push(tag) // depth-guard escape
      } else if (c === '&') {
        textBuffer.push(consumeEntity(textBuffer))
      } else {
        textBuffer.push(c)
        pos++
      }
    }
    flushText()
    return new Fragment({}, rootChildren)
  }

  /** Normalize any mixture of strings / arrays / Fragments into a flat array. */
  static normalize(input: any): any[] {
    const out: any[] = []
    function walk(node: any) {
      if (node === null || node === undefined || node === false) return
      if (Array.isArray(node)) { node.forEach(walk); return }
      if (node instanceof Fragment) { node.children.forEach(walk); return }
      out.push(node)
    }
    walk(input)
    return out
  }
}

// Compatibility export: other modules may destructure `h` as `{h,Fragment}`.
export default h

// NOTE: We intentionally no longer declare module '@satorijs/core' here. That
// augmentation was only meaningful in the satori ecosystem; in the Spak monorepo
// @satorijs/core is not installed and tsc would (rightly) flag it as an
// invalid augmentation target. Consumers should import Fragment/h directly
// from @spakjs/message instead.
//
// If satori support is ever restored the augmentation can be moved into a
// dedicated file guarded by /// <reference types="@satorijs/core" />.
