export function isInteger(source: any) {
  return typeof source === 'number' && Math.floor(source) === source
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function enumKeys<T extends string>(data: Record<T, string | number>) {
  return Object.values(data).filter(value => typeof value === 'string') as T[]
}

export function defineEnumProperty<T extends object>(object: T, key: keyof T, value: T[keyof T]) {
  object[key] = value
  ;(object as Record<string, any>)[value as unknown as string] = key
}

export function merge<T extends object>(head: T, base: T): T {
  Object.entries(base).forEach(([key, value]) => {
    // prevent prototype pollution attack — check BEFORE any write
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return
    if (!Object.hasOwn(head, key as keyof T)) {
      ;(head as Record<string, any>)[key] = value
      return
    }
    if (typeof value === 'object' && typeof head[key as keyof T] === 'object') {
      ;(head as Record<string, any>)[key] = merge((head as Record<string, any>)[key], value)
    } else {
      ;(head as Record<string, any>)[key] = value
    }
  })
  return head
}

export function assertProperty<O, K extends keyof O & string>(config: O, key: K) {
  if (!config[key]) throw new Error(`missing configuration "${key}"`)
  return config[key]
}

export function coerce(val: any) {
  // resolve error when stack is undefined, e.g. axios error with status code 401
  const { message, stack } = val instanceof Error && val.stack ? val : new Error(val as any)
  const lines = (stack || '').split('\n')
  const index = lines.findIndex(line => line.endsWith(message))
  return lines.slice(index).join('\n')
}

export function renameProperty<O extends object, K extends keyof O, T extends string>(config: O, key: K, oldKey: T) {
  config[key] = Reflect.get(config, oldKey) as any
  Reflect.deleteProperty(config, oldKey)
}

export function makeArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

export const Random = {
  int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  float: (min: number, max: number) => Math.random() * (max - min) + min,
}

export type Dict<T = any> = Record<string, T>

export function isNullable(value: any): boolean {
  return value == null
}

export function valueMap<K extends string, V>(obj: Record<string, V>, fn: (value: V, key: K) => V): Record<string, V> {
  const result: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = fn(obj[key], key as unknown as K)
    }
  }
  return result
}

type Methods<T> = {
  [K in keyof T]?: T[K] extends (...args: infer A) => infer R ? (this: T, ...args: A) => R : T[K]
}

import { resolve } from 'path'

export function extend<T>(prototype: T, methods: Methods<T>) {
  Object.defineProperties(prototype, Object.getOwnPropertyDescriptors(methods))
}

// ===== Spak 项目数据目录 =====
//
// 存储策略：一切数据（应用、registry、config、pid、缓存）都落在
// 「项目源码所在根」下的 data/ 子目录——不写全局 ~/.spak。
// 优先尊重 SPAK_DATA_DIR 环境变量（二进制/CI 可显式指定）。
export function projectDataDir(cwd?: string): string {
  return process.env.SPAK_DATA_DIR || resolve(cwd || process.cwd(), 'data')
}

/** Spak 数据目录下某个子目录（如 apps / registry / pid）。 */
export function projectDataSubDir(name: string, cwd?: string): string {
  return resolve(projectDataDir(cwd), name)
}
