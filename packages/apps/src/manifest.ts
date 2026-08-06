// ===== @spakjs/apps — Plugin Manifest Specification =====
//
// Every plugin MUST ship a `spak.manifest.json` that declares its
// identity, dependencies, permissions, and optional metadata.
//
// The manifest has three sections:
//   1. Required root fields (master, version, author, dependencies, permissions)
//   2. Optional header (name, author, company, description, category, audience)
//   3. Body (extensible, populated by other modules like INO)

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

// ===== Header (optional but if present, all fields required) =====
export interface ManifestHeader {
  /** 插件名称 */
  name: string
  /** 作者名称 */
  author: string
  /** 归属公司名称（* 代表没有） */
  company: string
  /** 软件简介 */
  description: string
  /** 软件分类 */
  category: string
  /** 适宜人群 */
  audience: string
}

// ===== Body (extensible, no fixed shape) =====
export interface ManifestBody {
  /** INO 冲突声明 — 由 INO 模块填充 */
  ino?: {
    /** 声明"我不要"的插件名称列表 */
    disallow?: string[]
  }
  /** 其他模块/插件可扩展的字段 */
  [key: string]: any
}

// ===== Root Manifest =====
export interface PluginManifest {
  // --- Required root fields ---
  /** 主入口文件路径（相对于插件目录） */
  master: string
  /** 版本号 */
  version: string
  /** 作者 */
  author: string
  /** 依赖列表 */
  dependencies: Record<string, string>
  /** 权限声明 */
  permissions: string[]

  // --- Optional header ---
  header?: ManifestHeader

  // --- Extensible body ---
  body?: ManifestBody
}

// ===== Validation =====
const REQUIRED_FIELDS: (keyof PluginManifest)[] = [
  'master', 'version', 'author', 'dependencies', 'permissions',
]

const REQUIRED_HEADER_FIELDS: (keyof ManifestHeader)[] = [
  'name', 'author', 'company', 'description', 'category', 'audience',
]

export interface ManifestValidationResult {
  valid: boolean
  errors: string[]
  manifest?: PluginManifest
}

/** Validate a manifest object against the specification. */
export function validateManifest(raw: any): ManifestValidationResult {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['manifest is not an object'] }
  }

  // Check required root fields
  for (const field of REQUIRED_FIELDS) {
    if (raw[field] === undefined || raw[field] === null) {
      errors.push(`missing required field: ${field}`)
    }
  }

  // Check types
  if (raw.master && typeof raw.master !== 'string') {
    errors.push('master must be a string (file path)')
  }
  if (raw.version && typeof raw.version !== 'string') {
    errors.push('version must be a string')
  }
  if (raw.author && typeof raw.author !== 'string') {
    errors.push('author must be a string')
  }
  if (raw.dependencies && typeof raw.dependencies !== 'object') {
    errors.push('dependencies must be an object')
  }
  if (raw.permissions && !Array.isArray(raw.permissions)) {
    errors.push('permissions must be an array of strings')
  }

  // Validate header if present
  if (raw.header !== undefined) {
    if (typeof raw.header !== 'object') {
      errors.push('header must be an object')
    } else {
      for (const field of REQUIRED_HEADER_FIELDS) {
        if (raw.header[field] === undefined || raw.header[field] === null) {
          errors.push(`header is present but missing required field: ${field}`)
        }
      }
      // company can be '*' (meaning none)
      if (raw.header.company !== undefined && typeof raw.header.company !== 'string') {
        errors.push('header.company must be a string (* means none)')
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    manifest: errors.length === 0 ? raw as PluginManifest : undefined,
  }
}

/** Load and validate a manifest from a plugin directory. */
export function loadManifest(pluginDir: string): ManifestValidationResult {
  const manifestPath = resolve(pluginDir, 'spak.manifest.json')
  if (!existsSync(manifestPath)) {
    return { valid: false, errors: [`manifest not found: ${manifestPath}`] }
  }

  let raw: any
  try {
    raw = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (err) {
    return { valid: false, errors: [`failed to parse manifest: ${(err as Error).message}`] }
  }

  return validateManifest(raw)
}

/** Create a sample manifest object (for scaffolding new plugins). */
export function createSampleManifest(name: string): PluginManifest {
  return {
    master: 'src/index.ts',
    version: '0.0.1',
    author: '*',
    dependencies: {},
    permissions: [],
    header: {
      name,
      author: '*',
      company: '*',
      description: `${name} plugin`,
      category: 'general',
      audience: 'all',
    },
    body: {},
  }
}
