import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'

const CONFIG_DIR = resolve(homedir(), '.spak')
const CONFIG_FILE = resolve(CONFIG_DIR, 'config.json')

export interface SpakConfig {
  language: string
  server: {
    host: string
    port: number
  }
  plugins: Record<string, any>
  cpc?: {
    enabled?: boolean
    sandbox?: { enabled?: boolean }
    processIsolation?: { enabled?: boolean }
    ssetps?: {
      enabled?: boolean
      /** Memory limit in MB for SSetPS RSS monitoring; 80% of this trips the warning + circuit breaker. */
      memoryLimitMB?: number
    }
  }
}

const defaultConfig: SpakConfig = {
  language: 'en',
  server: {
    host: '0.0.0.0',
    port: 4321,
  },
  plugins: {},
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function loadConfig(): SpakConfig {
  ensureConfigDir()
  if (!existsSync(CONFIG_FILE)) {
    saveConfig(defaultConfig)
    return { ...defaultConfig }
  }
  try {
    const data = readFileSync(CONFIG_FILE, 'utf-8')
    return { ...defaultConfig, ...JSON.parse(data) }
  } catch {
    return { ...defaultConfig }
  }
}

export function saveConfig(config: SpakConfig): void {
  ensureConfigDir()
  // Atomic write: write to a temp file first, then rename into place.
  // This prevents half-written JSON when the process crashes mid-write, and
  // reduces the race window between two concurrent setConfig() calls.
  const tmpFile = CONFIG_FILE + '.tmp.' + process.pid.toString(36)
  try {
    writeFileSync(tmpFile, JSON.stringify(config, null, 2), 'utf-8')
    // rename() is atomic on POSIX filesystems; on Windows we fallback to
    // replace via copy+unlink if rename fails.
    try {
      require('fs').renameSync(tmpFile, CONFIG_FILE)
    } catch {
      require('fs').copyFileSync(tmpFile, CONFIG_FILE)
      require('fs').unlinkSync(tmpFile)
    }
  } catch (err) {
    try { require('fs').unlinkSync(tmpFile) } catch { /* ignore */ }
    throw err
  }
}

export function getConfig(key: string): any {
  const config = loadConfig()
  const parts = key.split('.')
  let value: any = config
  for (const part of parts) {
    if (value === undefined || value === null) return undefined
    value = value[part]
  }
  return value
}

export function setConfig(key: string, value: any): SpakConfig {
  const config = loadConfig()
  const parts = key.split('.')
  let obj: any = config
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {}
    obj = obj[parts[i]]
  }
  obj[parts[parts.length - 1]] = value
  saveConfig(config)
  return config
}

export default { loadConfig, saveConfig, getConfig, setConfig }
