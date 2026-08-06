import { defineProperty } from 'cosmokit'
import { Context } from './context'
import { Session } from './session'

/**
 * Eval type for computed values with $eval expressions.
 * The $eval expression is evaluated using the safe interpolate function.
 * @example { $eval: 'env.FOO' }
 */
export namespace Eval {
  export type Expr<T> = { $eval: string } | { [K: string]: any }
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
