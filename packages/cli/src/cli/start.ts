import { hyphenate, isInteger } from '@spakjs/util'
import kleur from 'kleur'
import { readFile, writeFile, unlink } from 'fs/promises'
import { T } from '@spakjs/i18n'
import { CommandDeclaration } from './types'
// CPC module whitelist check is ALWAYS executed on startup regardless of
// cpc.enabled. This is intentional — loading untrusted modules must be
// blocked at the framework level before ANY user plugin code runs.
import { runModuleWhitelistCheck } from '../commands/cpc'
import { setDebugMode, getGlobalFormatter, simpleFormatter, defaultFormatter } from '@spakjs/log'

process.env.SPAK_SHARED = JSON.stringify({
  startTime: Date.now(),
})

const PID_FILE = '.spak.pid'

async function getRunningPid(): Promise<number | null> {
  try {
    const data = await readFile(PID_FILE, 'utf8')
    const pid = parseInt(data.trim(), 10)
    if (isNaN(pid)) return null
    try {
      process.kill(pid, 0)
      return pid
    } catch {
      return null
    }
  } catch {
    return null
  }
}

async function savePid(pid: number) {
  await writeFile(PID_FILE, String(pid), 'utf8')
}

async function stopService(signal: NodeJS.Signals = 'SIGTERM') {
  const pid = await getRunningPid()
  if (!pid) {
    console.log(kleur.yellow(T("spak.cli.serve.not_running")))
    return false
  }
  try {
    process.kill(pid, signal)
    console.log(kleur.green(T("spak.cli.stop.sent", { signal: String(signal), pid: String(pid) })))
    try { await unlink(PID_FILE) } catch {}
    return true
  } catch (err) {
    console.error(kleur.red(T("spak.cli.stop.failed", { pid: String(pid), error: String(err) })))
    return false
  }
}

async function killService() {
  return stopService('SIGKILL')
}

async function injectLanguageDeps() {
  const { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } = await import('fs')
  const { resolve } = await import('path')
  const packagesDir = resolve(process.cwd(), 'packages')

  if (!existsSync(packagesDir)) return

  const packages = readdirSync(packagesDir).filter((d: string) => {
    const p = resolve(packagesDir, d)
    return statSync(p).isDirectory() && existsSync(resolve(p, 'package.json'))
  })

  for (const pkg of packages) {
    const pkgPath = resolve(packagesDir, pkg, 'package.json')
    try {
      const data = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (!data.dependencies) data.dependencies = {}
      // NOTE: @spakjs/locales was merged into @spakjs/i18n (MODULE_DIVISION §2.3).
      // Use workspace:^ range which is the pnpm monorepo canonical spec.
      const targetPkg = '@spakjs/i18n'
      if (!data.dependencies[targetPkg]) {
        data.dependencies[targetPkg] = 'workspace:^'
        writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
        console.log(`[inject] ${T('spak.cli.inject.added', { pkg })}`)
      }
      const localesDir = resolve(packagesDir, pkg, 'locales')
      if (!existsSync(localesDir)) {
        mkdirSync(localesDir, { recursive: true })
        writeFileSync(resolve(localesDir, 'en-US.yml'), '# Empty locale\n', 'utf-8')
        console.log(`[inject] ${T('spak.cli.inject.created', { pkg })}`)
      } else if (!existsSync(resolve(localesDir, 'en-US.yml'))) {
        writeFileSync(resolve(localesDir, 'en-US.yml'), '# Empty locale\n', 'utf-8')
        console.log(`[inject] ${T('spak.cli.inject.created', { pkg })}`)
      }
    } catch (err) {
      if (process.env.SPAK_DEBUG) console.debug('[init-locales] pkg:', pkg, (err as any)?.message ?? String(err))
    }
  }
}

async function startService(file?: string) {
  // ==================================================================
  // DEBUG MODE — Enable detailed logging if requested
  // ==================================================================
  const isDebug = process.env.SPAK_DEBUG === 'true' || process.env.SPAK_LOG_TIME
  if (isDebug) {
    setDebugMode(true)
  }

  await savePid(process.pid)

  // ==================================================================
  // HARD GUARD — CPC module whitelist (always enforced, even without
  // cpc.enabled=true in config). Unauthorized packages/plugins cause
  // process.exit(1) from inside runModuleWhitelistCheck.
  // ==================================================================
  runModuleWhitelistCheck(true)

  // Normalize ESM / CJS / named-export shapes so that `new NodeLoader()`
  // always works regardless of how the loader module is bundled.
  const mod: any = await import('@spakjs/loader')
  const NodeLoader = (mod as any).default?.default ?? (mod as any).default ?? (mod as any).NodeLoader ?? mod
  const loader = new (NodeLoader as any)()

  try {
    await loader.init(file)
    await loader.readConfig(true)
  } catch (err: any) {
    console.error(`[CLI] readConfig failed: ${err.stack || err.message}`)
    throw err
  }

  // Host/port env overrides are applied directly via process.env
  // (SPAK_HOST / SPAK_PORT), consumed by server plugins.

  const app = await loader.createApp()
  await app.start()

  console.log(kleur.green(T("spak.cli.serve.started", { pid: String(process.pid) })))

  const onSignal = async (signal: NodeJS.Signals) => {
    console.log(kleur.yellow(`\n${T("spak.cli.serve.stopping", { signal: String(signal) })}`))
    await app.parallel('exit', signal)
    try { await unlink(PID_FILE) } catch {}
    process.exit(0)
  }
  process.on('SIGINT', () => onSignal('SIGINT'))
  process.on('SIGTERM', () => onSignal('SIGTERM'))

  if (!app.scope.runtime.children.length) {
    // Keep the Node.js event loop alive without spawning a dummy timer.
    // Referencing stdin keeps the process running identically to how a
    // long-running HTTP/IPC server would, and plays nicely with the
    // SIGINT/SIGTERM handlers above.
    process.stdin.resume()
  }
}

async function statusService() {
  const pid = await getRunningPid()
  if (!pid) {
    console.log(kleur.red(T("spak.cli.status.not_running")))
    return
  }

  let port = '?'
  let uptime = '?'
  let memUsage = '?'
  let cpuUsage = '?'
  let nodeVersion = process.version
  let platform = `${process.platform} ${process.arch}`
  let hostname = '?'
  let totalMem = '?'
  let freeMem = '?'
  let loadAvg: number[] = []
  let requestCount = 0
  let pluginCount = 0

  try {
    const logData = await readFile('spak.log', 'utf-8')
    const portMatch = logData.match(/listening at http:\/\/([^:]+):(\d+)/)
    if (portMatch) port = portMatch[2]
    const requests = logData.match(/\[REQUEST\]|\[HTTP\]|request|response/gi)
    requestCount = requests ? requests.length : 0
    const plugins = logData.match(/apply plugin/g)
    pluginCount = plugins ? plugins.length : 0
  } catch (err) {
    if (process.env.SPAK_DEBUG) console.debug('[status] read spak.log failed:', (err as any)?.message ?? String(err))
  }

  try {
    const os = await import('os')
    hostname = os.hostname()
    totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) + ' GB'
    freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1) + ' GB'
    loadAvg = os.loadavg()
  } catch (err) {
    if (process.env.SPAK_DEBUG) console.debug('[status] os module failed:', (err as any)?.message ?? String(err))
  }

  try {
    memUsage = ((process.memoryUsage().rss / 1024 / 1024).toFixed(1)) + ' MB'
    cpuUsage = (process.cpuUsage().user / 1000000).toFixed(2) + 's'
    const running = process.uptime()
    const hours = Math.floor(running / 3600)
    const mins = Math.floor((running % 3600) / 60)
    const secs = Math.floor(running % 60)
    uptime = `${hours}h ${mins}m ${secs}s`
  } catch (err) {
    if (process.env.SPAK_DEBUG) console.debug('[status] runtime stats failed:', (err as any)?.message ?? String(err))
  }

  const line = '─'.repeat(40)
  console.log()
  console.log(`  ${kleur.green('●')} ${kleur.bold(T('spak.cli.status.title'))} `)
  console.log(`  ${line}`)
  console.log(`  ${kleur.bold(T('spak.cli.status.service'))}`)
  console.log(`  ${T('spak.cli.status.pid_value', { pid: String(pid) })}`)
  console.log(`  ${T('spak.cli.status.port_value', { port })}`)
  console.log(`  ${T('spak.cli.status.uptime_value', { uptime })}`)
  console.log(`  ${T('spak.cli.status.plugins_value', { count: String(pluginCount) })}`)
  console.log(`  ${T('spak.cli.status.requests_value', { count: String(requestCount) })}`)
  console.log()
  console.log(`  ${kleur.bold(T('spak.cli.status.hardware'))}`)
  console.log(`  ${T('spak.cli.status.memory_value', { used: memUsage, total: totalMem })}`)
  console.log(`  ${T('spak.cli.status.free_value', { free: freeMem })}`)
  if (loadAvg.length >= 3) {
    console.log(`  ${T('spak.cli.status.load_value', { load: `${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}` })}`)
  }
  console.log(`  ${T('spak.cli.status.cpu_value', { usage: cpuUsage })}`)
  console.log(`  ${T('spak.cli.status.platform_value', { platform })}`)
  console.log()
  console.log(`  ${kleur.bold(T('spak.cli.status.environment'))}`)
  console.log(`  ${T('spak.cli.status.host_value', { host: hostname })}`)
  console.log(`  ${T('spak.cli.status.node_value', { version: nodeVersion })}`)
  console.log(`  ${T('spak.cli.status.log_value')}`)
  console.log(`  ${T('spak.cli.status.pid_file_value')}`)
  console.log(`  ${line}`)
  console.log()
}

const serveDeclarations: CommandDeclaration[] = [
  {
    command: 'serve',
    description: 'start spak application',
    args: [{ name: 'file', description: 'config file path' }],
    options: [
      { name: 'debug', description: 'specify debug namespace' },
      { name: 'log-level', description: 'specify log level (default: 2)', default: '2' },
      { name: 'log-time', description: 'show timestamp in logs' },
      { name: 'host', description: 'specify server host (default: 0.0.0.0)', default: '0.0.0.0' },
      { name: 'port', description: 'specify server port (default: 4321)', default: '4321' },
      { name: 'stop', description: 'stop running spak instance' },
      { name: 'restart', description: 'restart running spak instance' },
      { name: 'kill', description: 'force kill running spak instance' },
      { name: 'no-sandbox', description: 'disable plugin sandbox (WARNING: unsafe, plugins run without isolation)' },
    ],
    action: async (args, options) => {
      const file = args.file
      const { logLevel, debug, logTime, host, port, stop, restart, kill, noSandbox } = options

       if (kill) { await killService(); return }
       if (stop) { await stopService(); return }
       if (restart) {
         await stopService('SIGTERM')
         await new Promise(resolve => setTimeout(resolve, 1000))
         try { await unlink(PID_FILE) } catch {}
       }

       if (noSandbox) process.env.SPAK_NO_SANDBOX = '1'

       // Enable debug mode if log.debug is set
       if (options.debug === 'true') {
         setDebugMode(true)
       }

       process.env.SPAK_LOG_TIME = logTime || ''

      process.env.SPAK_LOG_TIME = logTime || ''
      process.env.SPAK_LOG_LEVEL = logLevel || ''
      process.env.SPAK_DEBUG = debug || ''
      process.env.SPAK_CONFIG_FILE = file || ''
      if (host) process.env.SPAK_HOST = host
      if (port) process.env.SPAK_PORT = String(port)

      if (process.env.SPAK_LOG_LEVEL && (!isInteger(Number(process.env.SPAK_LOG_LEVEL)) || Number(process.env.SPAK_LOG_LEVEL) < 0)) {
        console.warn(`${kleur.red('error')} ${T("spak.general.error")}`)
        process.exit(1)
      }

      await startService(file).catch((error) => {
        console.error(kleur.red(T("spak.cli.serve.start_failed", { error: String(error) })))
        process.exit(1)
      })
    },
  },
  {
    command: 'serve status',
    description: 'show spak service status',
    action: async () => {
      await statusService()
    },
  },
  {
    command: 'init-locales',
    description: 'inject @spakjs/locales dependency and create empty locales dir for each package in workspace',
    action: async () => {
      await injectLanguageDeps()
    },
  },
]

export default serveDeclarations
