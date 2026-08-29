// ===== spm/zip.ts — 零依赖简易 ZIP 打包器 =====
//
// 用 Node 内置 zlib 实现标准 ZIP 写入（方法 8 = DEFLATE）。
// 生成的 ZIP 可被 unzip / 7z / 系统归档工具正常解压。
//
// 支持：目录、文件、UTF-8 文件名、deflate 压缩。
// 不支持（本阶段不需要）：加密、分卷、ZIP64 大文件。

import { deflateRawSync, inflateRawSync } from 'zlib'
import { cwd } from 'process'
import { existsSync, readFileSync, statSync } from 'fs'
import { relative, resolve, sep } from 'path'

export interface ZipEntry {
  /** 包内路径（正斜杠，无前导 /） */
  path: string
  data: Buffer
  /** 文件时间戳（秒），默认 Date.now()/1000 */
  mtime?: number
}

// DOS 时间戳格式
function dosDateTime(mtime: number): { date: number; time: number } {
  const d = new Date(mtime * 1000)
  return {
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
  }
}

function crc32(buf: Buffer): number {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

/**
 * 把一组文件（可含目录）打包成 ZIP 的 Buffer。
 * files: 形如 { path, data } 的条目列表；path 用正斜杠。
 */
export function buildZip(entries: ZipEntry[]): Buffer {
  const chunks: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  const now = Math.floor(Date.now() / 1000)

  for (const entry of entries) {
    const name = Buffer.from(entry.path, 'utf8')
    const data = entry.data
    const mtime = entry.mtime ?? now
    const { date, time } = dosDateTime(mtime)
    const isDir = entry.path.endsWith('/')
    const crc = isDir ? 0 : crc32(data)
    const comp = isDir ? Buffer.alloc(0) : deflateRawSync(data)

    // Local file header
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: UTF-8 names
    local.writeUInt16LE(isDir ? 0 : 8, 8) // method
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comp.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28) // extra length

    chunks.push(local, name, comp)
    const localSize = 30 + name.length + comp.length
    const centralBase = offset

    // Central directory entry
    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0) // signature
    cd.writeUInt16LE(20, 4) // version made by
    cd.writeUInt16LE(20, 6) // version needed
    cd.writeUInt16LE(0x0800, 8) // flags
    cd.writeUInt16LE(isDir ? 0 : 8, 10) // method
    cd.writeUInt16LE(time, 12)
    cd.writeUInt16LE(date, 14)
    cd.writeUInt32LE(crc, 16)
    cd.writeUInt32LE(comp.length, 20)
    cd.writeUInt32LE(data.length, 24)
    cd.writeUInt16LE(name.length, 28)
    cd.writeUInt16LE(0, 30) // extra
    cd.writeUInt16LE(0, 32) // comment
    cd.writeUInt16LE(0, 34) // disk
    cd.writeUInt16LE(0, 36) // internal attrs
    cd.writeUInt32LE(isDir ? 0x10 : 0, 38) // external attrs (dir flag)
    cd.writeUInt32LE(centralBase, 42) // local header offset

    central.push(cd, name)
    offset += localSize
  }

  // End of central directory
  const cdSize = central.reduce((n, b) => n + b.length, 0)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // signature
  eocd.writeUInt16LE(0, 4) // disk
  eocd.writeUInt16LE(0, 6) // cd start disk
  eocd.writeUInt16LE(entries.length, 8) // entries on disk
  eocd.writeUInt16LE(entries.length, 10) // total entries
  eocd.writeUInt32LE(cdSize, 12) // cd size
  eocd.writeUInt32LE(offset, 16) // cd offset
  eocd.writeUInt16LE(0, 20) // comment len

  return Buffer.concat([...chunks, ...central, eocd])
}

/** 把一个本地目录递归读成 ZipEntry 列表。 */
export function dirToEntries(dirPath: string, basePath: string = dirPath): ZipEntry[] {
  const entries: ZipEntry[] = []
  const abs = resolve(basePath)
  const walk = (dir: string) => {
    const items = readdirSafe(dir)
    for (const item of items) {
      const full = resolve(dir, item)
      const rel = relative(abs, full).split(sep).join('/')
      let st: ReturnType<typeof statSync>
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) {
        entries.push({ path: rel + '/', data: Buffer.alloc(0) })
        walk(full)
      } else if (st.isFile()) {
        try {
          entries.push({ path: rel, data: readFileSync(full) })
        } catch { /* skip unreadable */ }
      }
    }
  }
  walk(dirPath)
  return entries
}

function readdirSafe(dir: string): string[] {
  try { return require('fs').readdirSync(dir) } catch { return [] }
}

/** 顶层辅助：打包某目录下所有文件。 */
export function zipDir(dirPath: string): Buffer {
  return buildZip(dirToEntries(dirPath))
}

export { existsSync, resolve }

/** 解压 ZIP Buffer → 文件条目列表（含目录，path 用正斜杠）。 */
export function extractZip(buf: Buffer): ZipEntry[] {
  const result: ZipEntry[] = []
  let eocdPos = -1
  // 找 EOCD（从文件尾往前搜签名 0x06054b50）
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdPos = i; break }
  }
  if (eocdPos < 0) throw new Error('invalid zip: no end of central directory')
  const entries = buf.readUInt16LE(eocdPos + 10)
  let pos = buf.readUInt32LE(eocdPos + 16)
  for (let i = 0; i < entries; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error('invalid zip: bad central directory entry')
    const method = buf.readUInt16LE(pos + 10)
    const compSize = buf.readUInt32LE(pos + 20)
    const uncompSize = buf.readUInt32LE(pos + 24)
    const nameLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const name = buf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8')
    // 读 local header 拿压缩数据起始位置
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('invalid zip: bad local header')
    const lNameLen = buf.readUInt16LE(localOffset + 26)
    const lExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const comp = buf.subarray(dataStart, dataStart + compSize)
    const data = compSize === 0 ? Buffer.alloc(0) : method === 8 ? inflateRawSync(comp) : comp
    if (data.length !== uncompSize) throw new Error(`invalid zip: size mismatch for ${name}`)
    result.push({ path: name, data })
    pos += 46 + nameLen + extraLen + commentLen
  }
  return result
}
