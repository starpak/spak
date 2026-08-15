import { coerce, makeArray, Random } from '@spakjs/util'
import { Awaitable, defineProperty, Dict, Time } from 'cosmokit'
import { EventOptions, Hook } from 'cordis'
import { Fragment, h } from '@spakjs/message'
import { Session } from './session'
import { Context } from './context'

declare module './context' {
  interface Context {
    $processor: Processor
    middleware<S extends Session = Session>(middleware: Middleware<S>, prepend?: boolean): () => boolean
  }

  interface Events {
    'middleware'(session: Session): void
  }
}

export class SessionError extends Error {
  constructor(public path: string | string[], public param?: Dict) {
    super(makeArray(path)[0])
  }
}

export type Next = (next?: Next.Callback) => Promise<void | Fragment | string>
export type Middleware<S extends Session = Session> = (session: S, next: Next) => Awaitable<void | Fragment | string>

export namespace Next {
  export const MAX_DEPTH = 64

  export type Queue = ((next?: Next) => Awaitable<void | Fragment | string>)[]
  export type Callback = void | string | ((next?: Next) => Awaitable<void | Fragment | string>)

  export async function compose(callback: Callback, next?: Next) {
    return typeof callback === 'function' ? callback(next) : callback
  }
}

export class Processor {
  _hooks: Hook[] = []
  _sessions: Dict<Session> = Object.create(null)

  constructor(private ctx: Context) {
    defineProperty(this, Context.current, ctx)
  }

  middleware(middleware: Middleware, options?: boolean | EventOptions) {
    if (typeof options !== 'object') {
      options = { prepend: options }
    }
    return this.ctx.lifecycle.register('middleware', this._hooks, middleware, options)
  }
}

export namespace SharedCache {
  export interface Entry<T> {
    value: T
    key: string
    refs: Set<number>
  }
}

export class SharedCache<T> {
  #keyMap = new Map<string, SharedCache.Entry<T>>()

  get(ref: number, key: string) {
    const entry = this.#keyMap.get(key)
    if (!entry) return
    entry.refs.add(ref)
    return entry.value
  }

  set(ref: number, key: string, value: T) {
    let entry = this.#keyMap.get(key)
    if (entry) {
      entry.value = value
    } else {
      entry = { value, key, refs: new Set() }
      this.#keyMap.set(key, entry)
    }
    entry.refs.add(ref)
  }

  delete(ref: number) {
    for (const key of [...this.#keyMap.keys()]) {
      const entry = this.#keyMap.get(key)
      if (!entry) continue
      const { refs } = entry
      refs.delete(ref)
      if (!refs.size) {
        this.#keyMap.delete(key)
      }
    }
  }
}
