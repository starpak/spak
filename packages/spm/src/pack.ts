// ===== spm/pack.ts — .pak 打包 =====
//
// .pak = Spak App Package，类 APK 的单文件应用包。
// 内部结构 = ZIP 容器：
//   spak.app.json     应用清单（必需）
//   <app 资源>        如 index.html / assets/* （由 manifest.staticDir 指向）
//
// 用途：一个 .pak = 一个可安装/可运行的应用，server 从 <项目根>/data/apps 加载。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { projectDataSubDir } from '@spakjs/util'
import { buildZip, dirToEntries } from './zip'
import { T } from '@spakjs/i18n'

export interface PackOptions {
  /** app 根目录（含 spak.app.json） */
  appDir: string
  /** 输出 .pak 文件路径（可选，默认 <项目根>/data/apps/<name>.pak） */
  out?: string
}

/**
 * 打包一个 app 目录成 .pak 单文件。
 * 返回生成的 .pak 路径。
 */
export function packApp(opts: PackOptions): string {
  const appDir = resolve(opts.appDir)
  const manifestPath = join(appDir, 'spak.app.json')
  if (!existsSync(manifestPath)) {
    throw new Error(T('spak.spm.manifest_not_found', { dir: appDir }))
  }

  let manifest: any
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (err) {
    throw new Error(T('spak.spm.manifest_parse_error', { file: manifestPath, error: (err as Error).message }))
  }

  const name = manifest.name
  if (!name) throw new Error(T('spak.server.manifest_name_required'))
  const version = manifest.version || '0.0.0'

  // 收集清单 + 运行资源
  const entries = []
  entries.push({ path: 'spak.app.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') })

  const IGNORE_DIRS = new Set(['node_modules', '.git', '.idea', '.vscode', 'target', 'out'])
  const pushDir = (dir: string, prefix: string) => {
    for (const e of dirToEntries(dir, dir)) {
      if (e.path.endsWith('/')) continue
      const segs = e.path.split('/')
      if (segs.some(s => IGNORE_DIRS.has(s))) continue
      entries.push({ path: join(prefix, e.path), data: e.data })
    }
  }

  // staticDir（如 ./dist）→ 静态前端构建产物，打包到 app/ 前缀
  const staticDir = manifest.staticDir ? resolve(appDir, manifest.staticDir) : join(appDir, 'dist')
  if (manifest.staticDir) {
    if (!existsSync(staticDir)) {
      throw new Error(T('spak.spm.static_dir_missing', { dir: staticDir }))
    }
    pushDir(staticDir, 'app')
  } else if (existsSync(staticDir)) {
    pushDir(staticDir, 'app')
  } else {
    // 无静态目录 = server 型应用，整个目录即运行源码
    pushDir(appDir, 'app')
  }

  const zipBuf = buildZip(entries)

  // 输出路径
  const out = opts.out
    ? resolve(opts.out)
    : join(projectDataSubDir('apps'), `${name}.pak`)

  mkdirSync(resolve(out, '..'), { recursive: true })
  writeFileSync(out, zipBuf)

  return out
}
