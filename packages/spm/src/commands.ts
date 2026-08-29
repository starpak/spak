// ===== spm/commands.ts — spm 专属命令（包管理 + 审查者）=====
//
// spm 是 Spak 的专属包管理器。本文件实现 spm 独有的命令声明与实现：
//   pack / list / info / install / uninstall / publish / version
// serve 等运行时启停命令由 @spakjs/cli 提供，spm 壳统一注入。
//
// 审查者（Auditor）：install 时对 .pak 内容做安全检查——防 zip-slip、
// 查可执行文件预声明（exec），未声明可执行内容的包拒绝安装。

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join, resolve, sep } from 'path'
import kleur from 'kleur'
import { T } from '@spakjs/i18n'
import { CommandDeclaration } from '@spakjs/cli'
import { packApp } from './pack'
import { extractZip } from './zip'
import { version as spmVersion } from '../package.json'

/** 应用安装根目录：~/.spak/.apps */
export function appsDir(): string {
  return join(homedir(), '.spak', '.apps')
}

/** 某个应用的实际安装路径：~/.spak/.apps/<name> */
export function appDir(name: string): string {
  return join(appsDir(), name)
}

// ---------- 安全审查 ----------

const EXEC_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.sh', '.py', '.rb', '.pl', '.exe', '.bat', '.cmd'])
const EXEC_INGREDIENTS = ['child_process', 'exec(', 'spawn(', 'eval(', 'Function(', 'process.env']
const FORBIDDEN_NAMES = ['node_modules', '.git', '.spak', '.apps']

export interface AuditResult {
  ok: boolean
  reasons: string[]
  execTargets: string[]
}

/** 审查 .pak 内容：路径安全 + 可执行内容预声明。 */
export function auditPak(pakEntries: { path: string; data: Buffer }[], manifest: AppManifest): AuditResult {
  const reasons: string[] = []
  const execTargets: string[] = []
  const isStaticFrontend = !!manifest.desktop || !!manifest.staticDir
  for (const entry of pakEntries) {
    const p = entry.path
    // zip-slip / 绝对路径防御
    if (p.startsWith('/') || p.includes('..') || p.split('/').some(seg => seg === '..')) {
      reasons.push(T('spak.spm.audit_unsafe_path', { path: p }))
    }
    const segs = p.split('/')
    if (segs.some(s => FORBIDDEN_NAMES.includes(s))) {
      reasons.push(T('spak.spm.audit_forbidden_dir', { path: p }))
    }
    // 可执行目标检测
    const fileName = p.slice(p.lastIndexOf('/') + 1)
    const ext = p.slice(p.lastIndexOf('.'))
    const shebang = entry.data.length > 2 && entry.data[0] === 0x23 && entry.data[1] === 0x21
    if (shebang) {
      execTargets.push(p)
    } else if (['.sh', '.py', '.rb', '.pl', '.exe', '.bat', '.cmd'].includes(ext.toLowerCase())) {
      execTargets.push(p)
    } else if (['.js', '.mjs', '.cjs', '.ts'].includes(ext.toLowerCase()) && !isStaticFrontend) {
      // server 型：JS/TS 是可执行入口，未声明 exec 即危险
      execTargets.push(p)
    }
    // 危险 API 启发式（仅对 server 型做扫描；静态前端允许浏览器侧代码）
    if (!isStaticFrontend) {
      const probe = entry.data.subarray(0, 4096)
      for (const needle of EXEC_INGREDIENTS) {
        if (probe.includes(Buffer.from(needle, 'utf8'))) {
          execTargets.push(`${p} (${needle})`)
          break
        }
      }
    }
    void fileName
  }
  const ok = reasons.length === 0
  return { ok, reasons, execTargets }
}

interface AppManifest { name: string; version: string; exec?: boolean; desktop?: boolean; staticDir?: string }

function readManifestFromZip(pakFile: string): AppManifest {
  const entries = extractZip(readFileSync(pakFile))
  const m = entries.find(e => e.path === 'spak.app.json')
  if (!m) throw new Error(T('spak.spm.manifest_not_in_pak', { file: pakFile }))
  const manifest = JSON.parse(m.data.toString('utf8'))
  if (!manifest.name) throw new Error(T('spak.server.manifest_name_required'))
  return {
    name: manifest.name,
    version: manifest.version || '0.0.0',
    exec: !!manifest.exec,
    desktop: !!manifest.desktop,
    staticDir: manifest.staticDir,
  }
}

// ---------- list ----------

export function listApps(): { name: string; version: string; dir: string }[] {
  const root = appsDir()
  if (!existsSync(root)) return []
  const out: { name: string; version: string; dir: string }[] = []
  for (const entry of readdirSync(root).sort()) {
    const full = join(root, entry)
    if (entry.startsWith('.') || !statSyncSafe(full)?.isDirectory()) continue
    const manifestPath = join(full, 'spak.app.json')
    if (!existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      out.push({ name: manifest.name ?? entry, version: manifest.version ?? '0.0.0', dir: full })
    } catch { /* skip broken */ }
  }
  return out
}

function statSyncSafe(p: string): ReturnType<typeof statSync> | undefined {
  try { return statSync(p) } catch { return undefined }
}

// ---------- install ----------

export function installApp(opts: { name?: string; file?: string }): string {
  const pakFile = resolve(opts.file || '')
  if (!existsSync(pakFile)) throw new Error(T('spak.spm.pak_not_found', { file: pakFile }))
  const manifest = readManifestFromZip(pakFile)
  const name = opts.name || manifest.name
  const entries = extractZip(readFileSync(pakFile))

  // ===== 审查者 =====
  const audit = auditPak(entries, manifest)
  if (!audit.ok) {
    throw new Error(
      T('spak.spm.audit_rejected') + '\n' + audit.reasons.map(r => `  ✗ ${r}`).join('\n')
    )
  }
  if (audit.execTargets.length > 0 && !manifest.exec) {
    throw new Error(
      T('spak.spm.audit_exec_undeclared', { count: String(audit.execTargets.length) }) +
      '\n  ' + audit.execTargets.slice(0, 8).join('\n  ')
    )
  }

  // ===== 落地安装 =====
  const target = appDir(name)
  if (existsSync(target)) rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  for (const entry of entries) {
    if (entry.path.endsWith('/')) {
      mkdirSync(join(target, entry.path), { recursive: true })
      continue
    }
    const dest = join(target, entry.path)
    mkdirSync(resolve(dest, '..'), { recursive: true })
    writeFileSync(dest, entry.data)
  }
  return target
}

// ---------- uninstall ----------

export function uninstallApp(name: string): void {
  const target = appDir(name)
  if (!existsSync(target)) throw new Error(T('spak.spm.not_installed', { name }))
  rmSync(target, { recursive: true, force: true })
}

// ---------- publish ----------

/** 发布 .pak 到本地 registry（~/.spak/.registry/<name>-<version>.pak + 索引）。 */
export function publishApp(opts: { name?: string; file: string }): string {
  const pakFile = resolve(opts.file)
  if (!existsSync(pakFile)) throw new Error(T('spak.spm.pak_not_found', { file: pakFile }))
  const manifest = readManifestFromZip(pakFile)
  const name = opts.name || manifest.name
  const registryDir = join(homedir(), '.spak', '.registry')
  mkdirSync(registryDir, { recursive: true })
  const dest = join(registryDir, `${name}-${manifest.version}.pak`)
  const indexFile = join(registryDir, 'index.json')
  const index: Record<string, string> = existsSync(indexFile)
    ? JSON.parse(readFileSync(indexFile, 'utf8')) : {}
  index[name] = `${name}-${manifest.version}.pak`
  writeFileSync(dest, readFileSync(pakFile))
  writeFileSync(indexFile, JSON.stringify(index, null, 2))
  return dest
}

/** 从本地 registry 解析 .pak 路径。 */
export function resolveFromRegistry(name: string): string | undefined {
  const indexFile = join(homedir(), '.spak', '.registry', 'index.json')
  if (!existsSync(indexFile)) return undefined
  const index: Record<string, string> = JSON.parse(readFileSync(indexFile, 'utf8'))
  const rel = index[name]
  if (!rel) return undefined
  const pak = join(homedir(), '.spak', '.registry', rel)
  return existsSync(pak) ? pak : undefined
}

// ---------- declarations ----------

export const spmDeclarations: CommandDeclaration[] = [
  {
    command: 'pack',
    description: '打包 app 目录为 .pak 单文件应用包',
    args: [{ name: 'appDir', description: T('spak.spm.arg_appdir'), required: true }],
    options: [
      { name: 'out', description: T('spak.spm.opt_out') },
    ],
    action: async (args, options) => {
      const appDirArg = args.appDir
      if (!appDirArg) {
        console.error(kleur.red(T('spak.spm.pack_requires_dir')))
        process.exit(1)
      }
      try {
        const target = packApp({ appDir: appDirArg, out: options.out })
        console.log(kleur.green(T('spak.spm.packed', { appDir: appDirArg, target })))
      } catch (err) {
        console.error(kleur.red(T('spak.spm.pack_error', { error: (err as Error).message })))
        process.exit(1)
      }
    },
  },
  {
    command: 'list',
    description: '列出已安装的应用',
    action: async () => {
      const apps = listApps()
      if (!apps.length) {
        console.log(kleur.dim(T('spak.spm.no_apps')))
        return
      }
      for (const app of apps) {
        console.log(`  ${kleur.bold().cyan(app.name)}/${kleur.green(app.version)} ${kleur.dim(app.dir)}`)
      }
    },
  },
  {
    command: 'info',
    description: '查看已安装应用的详细信息',
    args: [{ name: 'name', description: T('spak.spm.arg_name'), required: true }],
    action: async (args) => {
      const name = args.name
      const dir = appDir(name)
      const manifestPath = join(dir, 'spak.app.json')
      if (!existsSync(manifestPath)) {
        console.error(kleur.red(T('spak.spm.not_installed', { name })))
        process.exit(1)
      }
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      console.log(kleur.bold().cyan(manifest.name))
      console.log(`  ${T('spak.spm.info_version')}: ${kleur.green(manifest.version)}`)
      console.log(`  ${T('spak.spm.info_dir')}: ${dir}`)
      console.log(`  ${T('spak.spm.info_exec')}: ${manifest.exec ? kleur.yellow(T('spak.spm.yes')) : kleur.dim(T('spak.spm.no'))}`)
      if (manifest.staticDir) console.log(`  staticDir: ${manifest.staticDir}`)
      if (manifest.port) console.log(`  port: ${manifest.port}`)
    },
  },
  {
    command: 'install',
    description: '安装 .pak（本地文件或 registry），带安全审查',
    args: [{ name: 'name', description: T('spak.spm.arg_name'), required: false }],
    options: [
      { name: 'file', description: T('spak.spm.opt_file') },
    ],
    action: async (args, options) => {
      try {
        const name = args.name
        let file = options.file
        if (!file && name) file = resolveFromRegistry(name)
        if (!file) {
          console.error(kleur.red(T('spak.spm.install_need_source')))
          process.exit(1)
        }
        const target = installApp({ name, file })
        const manifest = readManifestFromZip(file)
        console.log(kleur.green(T('spak.spm.installed', { name: manifest.name, version: manifest.version, target })))
      } catch (err) {
        console.error(kleur.red(T('spak.spm.install_error', { error: (err as Error).message })))
        process.exit(1)
      }
    },
  },
  {
    command: 'uninstall',
    description: '卸载已安装的应用',
    args: [{ name: 'name', description: T('spak.spm.arg_name'), required: true }],
    action: async (args) => {
      const name = args.name
      try {
        uninstallApp(name)
        console.log(kleur.green(T('spak.spm.uninstalled', { name })))
      } catch (err) {
        console.error(kleur.red((err as Error).message))
        process.exit(1)
      }
    },
  },
  {
    command: 'publish',
    description: '发布 .pak 到本地 registry',
    args: [{ name: 'name', description: T('spak.spm.arg_name'), required: false }],
    options: [
      { name: 'file', description: T('spak.spm.opt_file'), default: '' },
    ],
    action: async (args, options) => {
      try {
        if (!options.file) {
          console.error(kleur.red(T('spak.spm.publish_need_file')))
          process.exit(1)
        }
        const dest = publishApp({ name: args.name, file: options.file })
        console.log(kleur.green(T('spak.spm.published', { file: dest })))
      } catch (err) {
        console.error(kleur.red(T('spak.spm.publish_error', { error: (err as Error).message })))
        process.exit(1)
      }
    },
  },
  {
    command: 'version',
    description: '显示 spm 与 spak 运行时版本',
    action: async () => {
      const platform = `${process.platform} ${process.arch}`
      const spakVersion = require('@spakjs/cli/package.json').version
      console.log(kleur.bold().cyan('spm') + '/' + kleur.green(spmVersion) + ' ' + kleur.yellow(platform))
      console.log(kleur.bold().cyan('spak') + '/' + kleur.green(spakVersion) + ' ' + kleur.yellow(platform) + ' node-' + process.version)
    },
  },
]

export default spmDeclarations