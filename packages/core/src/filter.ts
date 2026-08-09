import { defineProperty } from 'cosmokit'
import { Context } from './context'
import { Session } from './session'

/**
 * Safe evaluation of $eval expressions using path-based interpolation.
 * Only supports safe property access patterns like:
 * - 'env.FOO' - access environment variable
 * - 'user.name' - access user property
 * - 'session.id' - access session property
 * 
 * Does NOT support arbitrary JavaScript execution.
 * The expression is evaluated using the safe interpolate function.
 * @example { $eval: 'env.FOO' }
 */
export namespace Eval {
  export type Expr<T> = { $eval: string } | { [K: string]: any }
  
  /**
   * Safely evaluate a $eval expression without using eval().
   * Only supports dot-notation property access on whitelisted objects.
   * @param expr - The expression string to evaluate (e.g., 'env.FOO')
   * @param context - The context object containing env, user, session, etc.
   * @returns The resolved value or undefined if path not found
   */
  export function evaluate<T>(expr: string, context: Record<string, any>): T | undefined {
    // Reject any expression that looks like code injection
    // Only allow alphanumeric characters, dots, underscores, and hyphens
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$\-_]*)*$/.test(expr)) {
      throw new Error(`Invalid $eval expression: ${expr}. Only dot-notation property access is allowed.`)
    }
    
    const parts = expr.split('.')
    let result: any = context
    
    for (const part of parts) {
      if (result == null || typeof result !== 'object') {
        return undefined
      }
      // Use bracket notation safely with validated key
      result = result[part]
    }
    
    return result as T
  }
}

export namespace Computed {
  export interface Options {
  }
}

export type Computed<T> = T | Eval.Expr<T> | ((session: Session) => T)
export type Filter = (session: Session) => boolean

declare module './context' {
  interface Context {
    $filter: FilterService
    filter: Filter
    any(): this
    never(): this
    union(arg: Filter | this): this
    intersect(arg: Filter | this): this
    exclude(arg: Filter | this): this
  }
}

export class FilterService {
  constructor(private ctx: Context) {
    defineProperty(this, Context.current, ctx)

    ctx.filter = () => true
    ctx.on('internal/runtime', (runtime) => {
      if (!runtime.uid) return
      runtime.ctx.filter = (session) => {
        return runtime.children.some(p => p.ctx.filter(session))
      }
    })
  }

  any() {
    return this.ctx.extend({ filter: () => true })
  }

  never() {
    return this.ctx.extend({ filter: () => false })
  }

  union(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter
    return this.ctx.extend({ filter: s => this.ctx.filter(s) || filter(s) })
  }

  intersect(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter
    return this.ctx.extend({ filter: s => this.ctx.filter(s) && filter(s) })
  }

  exclude(arg: Filter | Context) {
    const filter = typeof arg === 'function' ? arg : arg.filter
    return this.ctx.extend({ filter: s => this.ctx.filter(s) && !filter(s) })
  }
}
