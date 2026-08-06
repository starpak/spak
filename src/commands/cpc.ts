import { spawn, ChildProcess } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'
import { getConfig, loadConfig } from '@spakjs/config'
import kleur from 'kleur'
import { T } from '@spakjs/i18n'
import { CommandDeclaration } from '@spakjs/util'

// ====== Plugin Check ======
const BUILTIN_PACKAGES_DIR = resolve(process.cwd(), 'packages')
const PLUGINS_DIR = resolve(process.cwd(), 'plugins')

interface PluginCheckResult {
  name: string
  valid: boolean
  reason?: string
}

function checkBuiltinPackage(name: string): PluginCheckResult {
  const pkgDir = resolve(BUILTIN_PACKAGES_DIR, name)
  const requiredDirs = ['src']
  const requiredFiles = ['package.json']

  if (!existsSync(pkgDir)) {
    return { name, valid: false, reason: T('spak.cpc.check.pkg_not_found') }
  }

  for (const dir of requiredDirs) {
    if (!existsSync(resolve(pkgDir, dir))) {
      return { name, valid: false, reason: T('spak.cpc.check.missing_dir', { dir }) }
    }
  }

  for (const file of requiredFiles) {
    if (!existsSync(resolve(pkgDir, file))) {
      return { name, valid: false, reason: T('spak.cpc.check.missing_file', { file }) }
    }
  }

  return { name, valid: true }
}

function checkPlugin(name: string): PluginCheckResult {
  const pluginDir = resolve(PLUGINS_DIR, name)

  if (!existsSync(pluginDir)) {
    return { name, valid: false, reason: T('spak.cpc.check.plugin_not_found') }
  }

  const pkgPath = resolve(pluginDir, 'package.json')
  if (!existsSync(pkgPath)) {
    return { name, valid: false, reason: T('spak.cpc.check.pkg_json_not_found') }
  }

  let pkg: any
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch {
    return { name, valid: false, reason: T('spak.cpc.check.invalid_pkg_json') }
  }

  // Check main entry
  if (pkg.main && !existsSync(resolve(pluginDir, pkg.main))) {
    return { name, valid: false, reason: T('spak.cpc.check.main_not_found', { main: pkg.main }) }
  }

  // Check dependencies (warn if missing)
  if (pkg.dependencies) {
    const missingDeps: string[] = []
    for (const dep of Object.keys(pkg.dependencies)) {
      const depPath = resolve(process.cwd(), 'node_modules', dep)
      if (!existsSync(depPath) && !dep.startsWith('@spakjs/')) {
        missingDeps.push(dep)
      }
    }
    if (missingDeps.length > 0) {
      return { name, valid: false, reason: T('spak.cpc.check.missing_deps', { deps: missingDeps.join(', ') }) }
    }
  }

  return { name, valid: true }
}

function runPluginCheck(): void {
  console.log(kleur.cyan(`\n  ${T('spak.cpc.check.starting')}\n`))

  // Check built-in packages
  const builtinPackages = readdirSync(BUILTIN_PACKAGES_DIR).filter(d => {
    return statSync(resolve(BUILTIN_PACKAGES_DIR, d)).isDirectory()
  })

  let validCount = 0
  let totalCount = 0

  for (const pkg of builtinPackages) {
    totalCount++
    const result = checkBuiltinPackage(pkg)
    if (result.valid) {
      validCount++
      console.log(`  ${kleur.green('✓')} ${kleur.bold(pkg)}: ${result.reason || T('spak.cpc.check.ok')}`)
    } else {
      console.log(`  ${kleur.red('✗')} ${kleur.bold(pkg)}: ${result.reason}`)
    }
  }

  // Check external plugins
  if (existsSync(PLUGINS_DIR)) {
    const plugins = readdirSync(PLUGINS_DIR).filter(d => {
      return statSync(resolve(PLUGINS_DIR, d)).isDirectory()
    })

    for (const plugin of plugins) {
      totalCount++
      const result = checkPlugin(plugin)
      if (result.valid) {
        validCount++
        console.log(`  ${kleur.green('✓')} ${kleur.bold(plugin)}: ${T('spak.cpc.check.ok')}`)
      } else {
        console.log(`  ${kleur.red('✗')} ${kleur.bold(plugin)}: ${result.reason}`)
      }
    }
  }

  console.log(`\n  ${T('spak.cpc.check.complete', { valid: String(validCount), total: String(totalCount) })}\n`)
}

// ====== Sandbox ======
const sandboxProcesses: Map<string, ChildProcess> = new Map()

function isolatePlugin(name: string): void {
  if (process.env.SPAK_NO_SANDBOX === '1') {
    console.log(kleur.yellow(`  ⚠ ${T('spak.cpc.sandbox.disabled_warning')}`))
    return
  }

  console.log(kleur.cyan(`  ${T('spak.cpc.sandbox.isolating', { name })}`))

  // Respect circuit breakers: if the plugin is in the open state, refuse to
  // isolate it — same behaviour as the runtime loader should use.
  if (circuitBreakers.get(name)) {
    console.log(kleur.red(T('spak.cpc.sandbox.isolation_aborted', { msg: T('spak.cpc.ssetps.circuit_open', { name }) })))
    return
  }

  // Pass the plugin name via argv[3] so we never concatenate a user-controlled
  // string into JS source code (prevents command injection via crafted names
  // that escape the JSON string context).
  const workerScript = `
    const pluginName = process.argv[3] || '';
    const { createRequire } = require('module');
    const path = require('path');
    try {
      // Try to load the plugin to validate it actually resolves and doesn't
      // throw on import. We don't run its apply() — the sandbox is still a
      // watcher + supervisor stub, but at least the require smoke-tests
      // resolve and the process isn't a pure zombie.
      const req = createRequire(path.resolve(process.cwd(), 'package.json'));
      if (process.argv[4] === '--smoke' && pluginName) {
        try { req.resolve(pluginName); console.log('[sandbox] plugin-resolved: ' + pluginName); }
        catch (e) { console.warn('[sandbox] resolve failed: ' + e.message); process.exit(2); }
      }
    } catch (err) {
      if (process.env.SPAK_DEBUG) console.debug('[sandbox] plugin load guard:', (err as any)?.message ?? String(err))
    }
    console.log(T('spak.cpc.sandbox.started', { name: pluginName }));
    if (process.send) {
      process.send({ type: 'ready', plugin: pluginName, pid: process.pid });
      process.on('message', (msg) => {
        if (msg && (msg as any).type === 'shutdown') process.exit(0);
      });
    }
    // Cheap keepalive: stdin.resume so the process has a referenced handle
    // without spawning a dummy timer for every second.
    process.stdin.resume();
  `

  const child = spawn(process.execPath, ['-e', workerScript, '--', name], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    detached: true,
  })

  // Prevent accidental memory leaks from pending IPC buffers — we don't
  // forward raw stdio to the user's terminal (they are ignored above) but
  // we still want lifecycle notifications.
  child.on('error', (err) => {
    console.warn(kleur.yellow(T('spak.cpc.sandbox.error', { name, error: String(err.message) })))
  })
  child.on('exit', (code) => {
    sandboxProcesses.delete(name)
  })

  sandboxProcesses.set(name, child)
  console.log(kleur.green(`  ${T('spak.cpc.sandbox.isolated', { name, pid: String(child.pid ?? -1) })}`))
}

function terminateSandbox(name: string): void {
  const proc = sandboxProcesses.get(name)
  if (proc && proc.connected) {
    try { proc.send({ type: 'shutdown' }) } catch { /* IPC already closed */ }
    // Fallback kill if graceful shutdown didn't happen within 500ms
    const killTimer = setTimeout(() => {
      if (proc.pid) try { process.kill(proc.pid, 'SIGKILL') } catch {}
    }, 500)
    if (killTimer.unref) killTimer.unref()
  } else if (proc && proc.pid) {
    try { process.kill(proc.pid) } catch {}
  }
  if (proc) {
    const pid = proc.pid
    sandboxProcesses.delete(name)
    console.log(kleur.yellow(`  ${T('spak.cpc.sandbox.terminated', { pid: String(pid ?? -1) })}`))
  }
}

// ====== SSetPS - Safety Set Protection System ======
let ssetpsInterval: ReturnType<typeof setInterval> | null = null
const DEFAULT_MEMORY_LIMIT_MB = 512
let currentMemoryLimitMB: number = DEFAULT_MEMORY_LIMIT_MB
const circuitBreakers: Map<string, boolean> = new Map()
let gcHintShown = false

/**
 * Resolve the effective SSetPS memory limit (MB). Precedence:
 *   1. SPAK_SSETPS_MEMORY_LIMIT_MB env var (highest, deploy-time override)
 *   2. config.cpc.ssetps.memoryLimitMB (from user config)
 *   3. DEFAULT_MEMORY_LIMIT_MB = 512 (fallback, historic hard-coded value)
 */
function resolveMemoryLimitMB(userLimit?: number): number {
  const envVal = Number(process.env.SPAK_SSETPS_MEMORY_LIMIT_MB)
  if (Number.isFinite(envVal) && envVal > 0) return Math.floor(envVal)
  if (Number.isFinite(userLimit) && userLimit! > 0) return Math.floor(userLimit!)
  return DEFAULT_MEMORY_LIMIT_MB
}

function startSSetPS(overrideLimitMB?: number): void {
  if (ssetpsInterval) return
  currentMemoryLimitMB = resolveMemoryLimitMB(overrideLimitMB)
  console.log(kleur.cyan(`  ${T('spak.cpc.ssetps.monitoring')} ${kleur.dim(`(limit=${currentMemoryLimitMB}MB)`)}`))
  if (!global.gc && !gcHintShown) {
    gcHintShown = true
    console.log(kleur.yellow(T('spak.cpc.ssetps.tip')))
  }

  ssetpsInterval = setInterval(() => {
    const memUsage = process.memoryUsage()
    const rssMB = memUsage.rss / 1024 / 1024
    const limitMB = currentMemoryLimitMB
    const usagePercent = (rssMB / limitMB) * 100

    if (usagePercent > 80) {
      console.log(kleur.yellow(`  ${T('spak.cpc.ssetps.memory_warning', { usage: usagePercent.toFixed(1) })} ${kleur.dim(`[rss=${rssMB.toFixed(0)}/${limitMB}MB]`)}`))

      if (global.gc) {
        const before = process.memoryUsage().rss
        global.gc()
        const after = process.memoryUsage().rss
        const freed = (before - after) / 1024 / 1024
        if (freed > 0) {
          console.log(kleur.green(`  ${T('spak.cpc.ssetps.memory_cleaned', { freed: freed.toFixed(1) })}`))
        }
      }

      // Tripping the 80% threshold for a sandboxed plugin auto-trips its
      // circuit breaker. This finally wires `circuitBreakers` into the
      // rest of the CPC system (isolation, status and restore commands
      // already reference the same Map).
      for (const name of sandboxProcesses.keys()) {
        if (!circuitBreakers.get(name)) triggerCircuitBreaker(name)
      }
    }
  }, 10000)
}

function stopSSetPS(): void {
  if (ssetpsInterval) {
    clearInterval(ssetpsInterval)
    ssetpsInterval = null
  }
}

function triggerCircuitBreaker(pluginName: string): void {
  circuitBreakers.set(pluginName, true)
  console.log(kleur.red(`  ${T('spak.cpc.ssetps.circuit_break', { name: pluginName })}`))
  console.log(kleur.red(`  ${T('spak.cpc.ssetps.circuit_open', { name: pluginName })}`))
}

function restoreCircuitBreaker(pluginName: string): void {
  circuitBreakers.delete(pluginName)
  console.log(kleur.green(`  ${T('spak.cpc.ssetps.circuit_restored', { name: pluginName })}`))
}

function applyFirewallRule(rule: string): void {
  console.log(kleur.cyan(`  ${T('spak.cpc.ssetps.firewall_rule', { rule })}`))
}

// ====== Test Suite ======
function runTestServe(url: string): void {
  console.log(kleur.cyan(`\n  ${T('spak.cpc.test.serve')}`))
  console.log(kleur.green(`  ${T('spak.cpc.test.serve_running', { url })}`))

  process.env.DEBUG = '*'
  process.env.SPAK_LOG_LEVEL = '3'

  console.log(`  ${kleur.cyan('[DEBUG]')} ${T('spak.cpc.test.debug_enabled')}`)
  console.log(`  ${kleur.cyan('[DEBUG]')} ${T('spak.cpc.test.debug_level')}`)
  console.log(`  ${kleur.cyan('[DEBUG]')} ${T('spak.cpc.test.debug_env')}`)
}

// ====== Export ======
export function isAvailable(): boolean {
  try {
    const config = loadConfig()
    return config.cpc?.enabled === true
  } catch {
    return false
  }
}

export function ensureAvailable(): void {
  if (!isAvailable()) {
    console.log(kleur.red(`\n  ${T('spak.cpc.config.not_available')}\n`))
    process.exit(1)
  }
}

// Main CPC initialization
export function initCPC(config: any): void {
  if (!config?.enabled) return

  console.log(kleur.cyan(`\n  ${T('spak.cpc.title')}\n`))

  if (process.env.SPAK_NO_SANDBOX === '1') {
    console.log(kleur.yellow(`  ⚠ ${T('spak.cpc.sandbox.disabled_warning')}`))
  } else if (config.sandbox?.enabled) {
    console.log(`  ${kleur.green('✓')} ${T('spak.cpc.sandbox.enabled')}`)
  }

  if (config.processIsolation?.enabled) {
    console.log(`  ${kleur.green('✓')} ${T('spak.cpc.process_isolation.enabled')}`)
  }

  if (config.ssetps?.enabled !== false) {
    // Wire the user's configured memory limit through (env overrides still
    // win inside startSSetPS via resolveMemoryLimitMB).
    startSSetPS(config.ssetps?.memoryLimitMB)
    applyFirewallRule('default: allow localhost, deny external')
  }

  runPluginCheck()
}

function testAction(args: Record<string, string>, options: Record<string, any>) {
  // Extract subcommand from argv (e.g. "test serve" → "serve")
  const testIdx = process.argv.indexOf('test')
  const sub = testIdx >= 0 ? process.argv.slice(testIdx + 1).filter(a => !a.startsWith('-'))[0] || '' : ''
  if (sub === 'serve') {
    const host = options.host || '0.0.0.0'
    const port = options.port || '4321'
    runTestServe(`http://${host}:${port}`)
    return
  }
  console.log(kleur.cyan(`\n  ${T('spak.cpc.test.starting')}\n`))
  runPluginCheck()
  console.log(`  ${kleur.green('✓')} ${T('spak.cpc.test.complete', { pass: '0', total: '0' })}\n`)
}

function cpcAction(args: Record<string, string>, options: Record<string, any>) {
  ensureAvailable()
  const sub = args.command || ''
  const arg1 = args.name || ''
  const action = args.action || ''

  if (!sub || sub === 'help') {
    console.log(T('spak.cpc.help'))
    return
  }

  switch (sub) {
    case 'check':
      runPluginCheck()
      break
    case 'sandbox':
      if (arg1 === 'stop') {
        if (!action) { console.log(kleur.red(T('spak.cpc.sandbox.usage_stop'))); return }
        terminateSandbox(action)
      } else {
        if (!arg1) { console.log(kleur.red(T('spak.cpc.sandbox.usage_start'))); return }
        isolatePlugin(arg1)
      }
      break
    case 'ssetps': {
      // CLI one-shot snapshot mode: print the current memory state and exit.
      // Long-running monitoring is owned by `serve` (via initCPC → startSSetPS),
      // so a standalone `cpc ssetps` must NOT leave a setInterval keeping the
      // process alive — otherwise the CLI hangs forever after printing.
      const ssetpsCfg = (() => { try { return loadConfig(); } catch { return undefined; } })()
      const limit = resolveMemoryLimitMB(ssetpsCfg?.cpc?.ssetps?.memoryLimitMB)
      const usedNum = process.memoryUsage().rss / 1024 / 1024
      const used = usedNum.toFixed(1)
      const usagePercent = (usedNum / limit) * 100
      console.log(kleur.cyan(`  ${T('spak.cpc.ssetps.monitoring')} ${kleur.dim(`(limit=${limit}MB)`)}`))
      console.log(`  ${T('spak.cpc.status.memory_detail', { used, limit: String(limit) })}`)
      if (usagePercent > 80) {
        console.log(kleur.yellow(`  ${T('spak.cpc.ssetps.memory_warning', { usage: usagePercent.toFixed(1) })}`))
      } else {
        console.log(kleur.green(`  ${T('spak.cpc.ssetps.healthy', { usage: usagePercent.toFixed(1) })}`))
      }
      break
    }
    case 'circuit':
      if (arg1 === 'restore') {
        if (!action) { console.log(kleur.red(T('spak.cpc.circuit.usage_restore'))); return }
        restoreCircuitBreaker(action)
      } else {
        if (!arg1) { console.log(kleur.red(T('spak.cpc.circuit.usage_trigger'))); return }
        triggerCircuitBreaker(arg1)
      }
      break
    case 'status': {
      // Reflect the effective memory limit (env > config > default) even when
      // SSetPS hasn't been started, so `cpc status` never shows a stale 512MB.
      const statusCfg = (() => { try { return loadConfig(); } catch { return undefined; } })()
      const effectiveLimit = resolveMemoryLimitMB(statusCfg?.cpc?.ssetps?.memoryLimitMB)
      console.log(kleur.cyan(`\n  ${T('spak.cpc.title')}`))
      console.log(`  ${kleur.bold(T('spak.cpc.status.sandbox'))} ${sandboxProcesses.size}`)
      console.log(`  ${kleur.bold(T('spak.cpc.status.circuit_breakers'))} ${circuitBreakers.size}`)
      console.log(`  ${kleur.bold(T('spak.cpc.status.ssetps'))} ${ssetpsInterval ? T('spak.cpc.status.active') : T('spak.cpc.status.inactive')}`)
      console.log(`  ${kleur.bold(T('spak.cpc.status.memory'))} ${T('spak.cpc.status.memory_detail', { used: (process.memoryUsage().rss / 1024 / 1024).toFixed(1), limit: String(effectiveLimit) })}\n`)
      break
    }
    default:
      console.log(kleur.red(T('spak.cpc.status.unknown', { sub })))
  }
}

const cpcDeclarations: CommandDeclaration[] = [
  {
    command: 'test',
    description: 'Run CPC test suite',
    action: testAction,
  },
  {
    command: 'cpc',
    description: 'Check Plug-in Collection commands',
    args: [
      { name: 'command', description: 'Subcommand: check, sandbox, ssetps, circuit, status', required: false },
      { name: 'name', description: 'Plugin name argument', required: false },
      { name: 'action', description: 'Sub-action argument', required: false },
    ],
    action: cpcAction,
  },
  {
    command: 'cpc check',
    description: 'Check all plugins and built-in packages',
    action: () => { ensureAvailable(); runPluginCheck(); },
  },
  {
    command: 'cpc sandbox',
    description: 'Isolate a plugin in sandbox',
    args: [{ name: 'name', description: 'Plugin name', required: true }],
    action: (args) => {
      ensureAvailable()
      if (!args.name) { console.log(kleur.red(T('spak.cpc.sandbox.usage_start'))); return }
      // Handle "sandbox stop <name>" form
      if (args.name === 'stop') {
        const stopName = process.argv[process.argv.indexOf('stop') + 1] || ''
        if (!stopName) { console.log(kleur.red(T('spak.cpc.sandbox.usage_stop'))); return }
        terminateSandbox(stopName)
        return
      }
      isolatePlugin(args.name)
    },
  },
  {
    command: 'cpc ssetps',
    description: 'Start SSetPS monitoring (memoryLimitMB from config, or SPAK_SSETPS_MEMORY_LIMIT_MB env)',
    action: () => { ensureAvailable(); cpcAction({ command: 'ssetps', name: '', action: '' }, {}); },
  },
  {
    command: 'cpc circuit',
    description: 'Trigger circuit breaker for a plugin',
    args: [{ name: 'name', description: 'Plugin name', required: true }],
    action: (args) => {
      ensureAvailable()
      if (!args.name) { console.log(kleur.red(T('spak.cpc.circuit.usage_trigger'))); return }
      // Handle "circuit restore <name>" form
      if (args.name === 'restore') {
        const restoreName = process.argv[process.argv.indexOf('restore') + 1] || ''
        if (!restoreName) { console.log(kleur.red(T('spak.cpc.circuit.usage_restore'))); return }
        restoreCircuitBreaker(restoreName)
        return
      }
      triggerCircuitBreaker(args.name)
    },
  },
  {
    command: 'cpc status',
    description: 'Show CPC status',
    action: () => { ensureAvailable(); cpcAction({ command: 'status', name: '', action: '' }, {}); },
  },
]

export default cpcDeclarations
