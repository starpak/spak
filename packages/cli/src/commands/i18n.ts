// ===== spak i18n — i18n key 管理命令 =====
//
// `spak i18n init` 遍历所有 workspace 包（以及根 src/），从源码中提取
// T 调用里的 i18n key（T('...') / t("...") 字面量），凡是没有收录进
// locales key 文件的 key，都会以「仅 key、空内容」的形式追加进去，
// 供后续翻译填充。
//
// key 文件 = 项目根 /locales/{zh,en-US}.yml（统一权威翻译文件）。zh 与
// en-US 同步追加，维持项目「中英对称」约定。追加采用扁平点号 key 形式
// （如 `spak.cli.i18n.foo: ""`），与 i18n 包 flattenKeys 的读取语义完全
// 兼容，且不触碰文件原有内容与注释。

import kleur from 'kleur'
import { readFileSync, readdirSync, writeFileSync, statSync, existsSync } from 'fs'
import { resolve, join } from 'path'
import { T, loadYmlTranslation } from '@spakjs/i18n'
import { CommandDeclaration } from '@spakjs/util'

const KEY_REGEX = /\b[Tt]\s*\(\s*(['"`])([^'"`]+)\1/g

/** Recursively collect translatable keys from a directory's source files. */
function collectKeysFromDir(dir: string, keys: Set<string>): void {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'lib') continue
    const full = join(dir, entry)
    let stat
    try { stat = statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      collectKeysFromDir(full, keys)
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      let content: string
      try { content = readFileSync(full, 'utf8') } catch { continue }
      KEY_REGEX.lastIndex = 0
      // Skip comment lines so that doc comments mentioning T('...') never
      // leak pseudo keys into the key files.
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trimStart()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
        KEY_REGEX.lastIndex = 0
        let match
        while ((match = KEY_REGEX.exec(line)) !== null) {
          const key = match[2].trim()
          // Reject placeholder-ish keys (e.g. '...') that are not real keys.
          if (key && !/^[.\-…_]+$/.test(key)) keys.add(key)
        }
      }
    }
  }
}

async function runI18nInit(dryRun = false): Promise<void> {
  const root = process.cwd()

  // 1) 扫描所有包 + 根 src 提取 key
  const scannedKeys = new Set<string>()
  const packagesDir = resolve(root, 'packages')
  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir).filter((d) => {
      const p = resolve(packagesDir, d)
      try { return statSync(p).isDirectory() && existsSync(resolve(p, 'package.json')) } catch { return false }
    })
    for (const pkg of packages) {
      collectKeysFromDir(resolve(packagesDir, pkg, 'src'), scannedKeys)
    }
  }
  collectKeysFromDir(resolve(root, 'src'), scannedKeys)

  // 2) 读取 key 文件现有 key（zh / en-US）
  const BANNER =
    '# ==========================================\n' +
    '# spak i18n init — 自动补全（仅 key，待翻译）\n' +
    '# ==========================================\n'

  const appendMissing = (fileName: string, lang: string): string[] => {
    const file = resolve(root, 'locales', fileName)
    if (!existsSync(file)) return []
    // loadYmlTranslation gives us the flattened key → value map, i.e. the
    // authoritative list of keys already present in the key file.
    const existing = loadYmlTranslation(lang)
    const missing = [...scannedKeys].filter((k) => !(k in existing)).sort()
    if (!missing.length) return []
    if (!dryRun) {
      const block = BANNER + missing.map((k) => `${k}: ""`).join('\n') + '\n'
      writeFileSync(file, readFileSync(file, 'utf8') + '\n' + block, 'utf8')
    }
    return missing
  }

  const zhAdded = appendMissing('zh.yml', 'zh')
  const enAdded = appendMissing('en-US.yml', 'en')

  // 3) 输出结果
  if (!zhAdded.length && !enAdded.length) {
    console.log(kleur.green(dryRun
      ? T('spak.cli.i18n.check_clean', { count: String(scannedKeys.size) })
      : T('spak.cli.i18n.uptodate', { count: String(scannedKeys.size) })))
    return
  }
  const zhCount = zhAdded.length
  const enCount = enAdded.length
  if (zhCount) console.log(kleur.green(T('spak.cli.i18n.added', { lang: 'zh', count: String(zhCount), file: dryRun ? 'locales/zh.yml (check)' : 'locales/zh.yml' })))
  if (enCount) console.log(kleur.green(T('spak.cli.i18n.added', { lang: 'en-US', count: String(enCount), file: dryRun ? 'locales/en-US.yml (check)' : 'locales/en-US.yml' })))
  if (zhAdded.length) {
    console.log(kleur.dim(`  ${T('spak.cli.i18n.key_list')}: ${zhAdded.join(', ')}`))
  }
  if (dryRun && (zhAdded.length || enAdded.length)) {
    console.log(kleur.yellow(T('spak.cli.i18n.dry_run')))
  }
}

export const i18nDeclarations: CommandDeclaration[] = [
  {
    command: 'i18n',
    description: 'i18n key management commands',
    action: async () => {
      // Root command: registry shows the subcommand list via help.
    },
  },
  {
    command: 'i18n init',
    description: 'scan all packages and append missing i18n keys (key-only, empty content) to locales key files',
    action: async () => {
      await runI18nInit()
    },
  },
  {
    command: 'i18n check',
    description: 'dry-run: report which i18n keys are missing without writing anything',
    action: async () => {
      await runI18nInit(true)
    },
  },
]

export default i18nDeclarations