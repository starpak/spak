/**
 * Safely resolve a dot-separated path from a context object.
 * Only supports simple property access (e.g., `env.FOO`, `a.b.c`).
 * Returns `undefined` for any path that contains unsafe characters or cannot be resolved.
 */
function resolvePath(context: object, path: string): any {
  // Only allow alphanumeric, dot, underscore, and bracket notation for indices
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$.\[\]'"]*$/.test(path)) return undefined
  try {
    let value: any = context
    // Simple path splitting by dots, handling bracket access
    const parts = path.split('.')
    for (const part of parts) {
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') return undefined
      if (value == null || typeof value !== 'object') return undefined
      value = value[part]
    }
    return value
  } catch {
    return undefined
  }
}

export function interpolate(template: string, context: object, pattern = /\{\{([\s\S]+?)\}\}/g) {
  let capture: RegExpExecArray | null = null
  let result = '', lastIndex = 0
  while ((capture = pattern.exec(template))) {
    result += template.slice(lastIndex, capture.index)
    const value = resolvePath(context, capture[1].trim())
    result += value ?? ''
    lastIndex = capture.index + capture[0].length
  }
  return result + template.slice(lastIndex)
}

export function escapeRegExp(source: string) {
  return source
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/-/g, '\\x2d')
}

export function hyphenate(text: string) {
  return text.replace(/[A-Z]/g, '-$&').toLowerCase().replace(/^-/, '')
}
