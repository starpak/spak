// ===== @spakjs/log — multi-transport logger =====
//
// Independent of @spakjs/core (no circular dependency). May use Node IO
// (fs/path) for the file transport, so this package is Node-only — same
// tier as @spakjs/loader and @spakjs/config, NOT the zero-side-effect
// util/message tier.
//
// Zero third-party dependencies: usable by anyone, not just spak users.

import { appendFileSync, existsSync, renameSync, statSync } from 'fs'
import { resolve } from 'path'

// ===== Levels =====
/** Increasing verbosity. `silent` disables output. */
export enum LogLevel {
  silent = 0,
  error = 1,
  warn = 2,
  info = 3,
  debug = 4,
  trace = 5,
}

export const LEVEL_NAMES: Record<number, string> = {
  1: 'ERROR',
  2: 'WARN',
  3: 'INFO',
  4: 'DEBUG',
  5: 'TRACE',
}

// ===== Record =====
export interface LogRecord {
  level: LogLevel
  scope: string
  message: string
  args: any[]
  time: Date
}

// ===== Debug Mode =====
/** Global debug mode flag. When true, logs include full timestamp, scope, and detailed info. */
let _debugMode = false
let _initialized = false

export function isDebugMode(): boolean {
  return _debugMode
}

export function setDebugMode(enabled: boolean): void {
  _debugMode = enabled
  if (!_initialized) {
    initFormatter()
  }
}

// ===== Formatter =====
export type Formatter = (record: LogRecord) => string

function formatArg(arg: any): string {
  if (arg instanceof Error) return arg.stack || arg.message
  if (typeof arg === 'string') return arg
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

/** Plain formatter: `2026-07-29T... INFO [scope] message args` */
export function defaultFormatter(record: LogRecord): string {
  const time = record.time.toISOString()
  const level = (LEVEL_NAMES[record.level] || 'LOG').padEnd(5)
  const scope = record.scope ? `[${record.scope}]` : ''
  const args = record.args.length ? ' ' + record.args.map(formatArg).join(' ') : ''
  return `${time} ${level} ${scope} ${record.message}${args}`
}

/** Simple formatter (CLI mode): `[I] message` or `[W] message` */
export function simpleFormatter(record: LogRecord): string {
  const level = (LEVEL_NAMES[record.level] || 'LOG').padStart(2, ' ')
  const prefix = `[${level}]`
  return `${prefix} ${record.message}`
}

// ANSI escapes (no kleur dependency — keeps the package self-contained).
const ANSI = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

const LEVEL_COLORS: Record<number, string> = {
  1: ANSI.red,
  2: ANSI.yellow,
  3: ANSI.green,
  4: ANSI.cyan,
  5: ANSI.magenta,
}

/** Colored formatter for TTY consoles. */
export function colorFormatter(record: LogRecord): string {
  const time = ANSI.gray + record.time.toISOString() + ANSI.reset
  const color = LEVEL_COLORS[record.level] || ''
  const level = color + (LEVEL_NAMES[record.level] || 'LOG').padEnd(5) + ANSI.reset
  const scope = record.scope ? ANSI.gray + '[' + record.scope + ']' + ANSI.reset : ''
  const args = record.args.length ? ' ' + record.args.map(formatArg).join(' ') : ''
  return `${time} ${level} ${scope} ${record.message}${args}`
}

// ===== Transport =====
export abstract class Transport {
  /** Minimum level this transport will emit. Independent of global level. */
  level: LogLevel = LogLevel.info
  abstract render(record: LogRecord): void
}

/** Writes colored output to process.stdout (info+) / process.stderr (error/warn). */
export class ConsoleTransport extends Transport {
  constructor(public formatter: Formatter = colorFormatter) {
    super()
  }

  render(record: LogRecord): void {
    const text = this.formatter(record) + '\n'
    if (record.level <= LogLevel.error) {
      process.stderr.write(text)
    } else {
      process.stdout.write(text)
    }
  }
}

// Global formatter selection
let _globalFormatter = simpleFormatter

export function getGlobalFormatter(): Formatter {
  return _globalFormatter
}

export function setGlobalFormatter(formatter: Formatter): void {
  _globalFormatter = formatter
}

// Initialize global formatter (will be set by CLI on startup)
export function initFormatter(): void {
  // Default to simple formatter (normal mode)
  // Debug mode is set via setDebugMode() which will be called by CLI
  if (isDebugMode()) {
    _globalFormatter = defaultFormatter
  } else {
    _globalFormatter = simpleFormatter
  }
}

export interface FileTransportOptions {
  /** Target log file path (relative to CWD resolved). */
  path: string
  /** Max bytes before rotation. Default 5 MB. */
  maxSize?: number
  formatter?: Formatter
}

/** Appends formatted lines to a file with size-based rotation. */
export class FileTransport extends Transport {
  private readonly filePath: string
  private readonly maxSize: number
  formatter: Formatter

  constructor(options: FileTransportOptions) {
    super()
    this.filePath = resolve(options.path)
    this.maxSize = options.maxSize ?? 5 * 1024 * 1024
    this.formatter = options.formatter ?? defaultFormatter
  }

  render(record: LogRecord): void {
    const text = this.formatter(record) + '\n'
    try {
      this.maybeRotate()
      appendFileSync(this.filePath, text, 'utf8')
    } catch {
      // logging must never throw — swallow
    }
  }

  private maybeRotate(): void {
    try {
      if (!existsSync(this.filePath)) return
      if (statSync(this.filePath).size >= this.maxSize) {
        renameSync(this.filePath, `${this.filePath}.${Date.now()}`)
      }
    } catch {
      // rotation failure must not stop logging
    }
  }
}

/** Writes formatted lines to any object with a `write(str)` method. */
export class StreamTransport extends Transport {
  constructor(
    public stream: { write: (s: string) => boolean },
    public formatter: Formatter = defaultFormatter,
  ) {
    super()
  }

  render(record: LogRecord): void {
    this.stream.write(this.formatter(record) + '\n')
  }
}

// ===== Global config =====
let globalLevel: LogLevel = LogLevel.info
let globalTransports: Transport[] = []
let globalFormatter: Formatter = defaultFormatter

const defaultConsoleTransport = new ConsoleTransport()

export interface LoggerOptions {
  level?: LogLevel
  transports?: Transport[]
  formatter?: Formatter
}

/** Configure the global logger registry. Replaces only the fields you pass. */
export function configureLogger(options: LoggerOptions): void {
  if (options.level !== undefined) globalLevel = options.level
  if (options.transports !== undefined) globalTransports = options.transports
  if (options.formatter !== undefined) globalFormatter = options.formatter
}

/** Read the current global logger configuration. */
export function getLoggerConfig(): {
  level: LogLevel
  transports: Transport[]
  formatter: Formatter
} {
  return { level: globalLevel, transports: globalTransports, formatter: globalFormatter }
}

// ===== Logger =====
export class Logger {
  constructor(
    public scope: string = '',
    /** Per-instance override; falls back to the global level. */
    public level?: LogLevel,
  ) {}

  private dispatch(level: LogLevel, message: string, args: any[]): void {
    const effective = this.level ?? globalLevel
    if (level <= LogLevel.silent || level > effective) return
    const record: LogRecord = { level, scope: this.scope, message, args, time: new Date() }
    const targets = globalTransports.length ? globalTransports : [defaultConsoleTransport]
    for (const t of targets) {
      if (level <= t.level) t.render(record)
    }
  }

  error(message: string, ...args: any[]): void {
    this.dispatch(LogLevel.error, message, args)
  }
  warn(message: string, ...args: any[]): void {
    this.dispatch(LogLevel.warn, message, args)
  }
  info(message: string, ...args: any[]): void {
    this.dispatch(LogLevel.info, message, args)
  }
  debug(message: string, ...args: any[]): void {
    this.dispatch(LogLevel.debug, message, args)
  }
  trace(message: string, ...args: any[]): void {
    this.dispatch(LogLevel.trace, message, args)
  }
}

/** Create a scoped logger instance. */
export function createLogger(scope?: string, level?: LogLevel): Logger {
  return new Logger(scope, level)
}

// ===== cordis bridge =====
//
// Best-effort: forward cordis Logger output into the @spakjs/log transport
// chain so existing `new Logger('scope')` (cordis) calls flow through the
// same file/stream transports. Feature-detected against `Logger.targets`;
// if cordis changes its internal contract this simply no-ops rather than
// throwing. For guaranteed capture, prefer `createLogger()` from this
// package directly (as the daemon plugin now does).
export interface CordisAttachment {
  /** Remove the forwarder previously installed by `attachCordis`. */
  detach: () => void
}

export function attachCordis(cordisLoggerModule: any): CordisAttachment {
  const LoggerClass = cordisLoggerModule?.Logger ?? cordisLoggerModule
  const noop: CordisAttachment = { detach: () => {} }
  if (!LoggerClass || !Array.isArray(LoggerClass.targets)) return noop

  // Map cordis level strings/numbers to our LogLevel enum. The mapping is a
  // superset on purpose — different cordis versions pass different values.
  // Note: `silly`/`fatal`/`success` are NOT part of the official LogLevel
  // enum to preserve backwards compatibility — they are mapped to the
  // closest matching level instead.
  const toLevel = (lv: any): LogLevel => {
    switch (typeof lv === 'number' ? lv : String(lv || 'info').toLowerCase()) {
      case 0: case 'silly': return LogLevel.trace
      case 1: case 'debug': case 'trace': return LogLevel.debug
      case 2: case 'info': case 'log': case 'success': return LogLevel.info
      case 3: case 'warn': case 'warning': return LogLevel.warn
      case 4: case 'error': case 'err': case 'fatal': return LogLevel.error
      case 5: case 6: return LogLevel.error
      default: return LogLevel.info
    }
  }

  // cordis target contract: `print(text, level?)` or `print(record)` — we
  // probe the call arity and the shape of the first argument to detect
  // structured records vs plain text.
  const forwarder = {
    colors: false,
    print: function (this: any, firstArg: any, secondArg?: any) {
      // Structured record, e.g. { level, message, scope, ... }
      if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
        const stripped = String(firstArg.message ?? firstArg.msg ?? '').replace(/\x1b\[[0-9;]*m/g, '').trimEnd()
        if (!stripped) return
        const level = toLevel(firstArg.level)
        const record: LogRecord = {
          level,
          scope: firstArg.scope ?? firstArg.name ?? 'cordis',
          message: stripped,
          args: firstArg.args ?? [],
          time: new Date(),
        }
        const targets = globalTransports.length ? globalTransports : [defaultConsoleTransport]
        for (const t of targets) {
          if (level <= t.level) t.render(record)
        }
        return
      }

      const stripped = String(firstArg ?? '').replace(/\x1b\[[0-9;]*m/g, '').trimEnd()
      if (!stripped) return
      const level = arguments.length >= 2 ? toLevel(secondArg) : LogLevel.info
      const record: LogRecord = {
        level,
        scope: 'cordis',
        message: stripped,
        args: [],
        time: new Date(),
      }
      const targets = globalTransports.length ? globalTransports : [defaultConsoleTransport]
      for (const t of targets) {
        if (level <= t.level) t.render(record)
      }
    } as any,
  }

  LoggerClass.targets.push(forwarder)
  return {
    detach() {
      const i = LoggerClass.targets.indexOf(forwarder)
      if (i >= 0) LoggerClass.targets.splice(i, 1)
    },
  }
}

// ===== Spak Output Manager =====
//
// The log module is the SINGLE source of truth for startup/shutdown output.
// All plugins MUST route their output through the log module — direct
// console.log usage in plugins is prohibited.
//
// These helpers emit structured banners ONLY on startup and shutdown;
// mid-runtime logging is expected to use createLogger() directly.

export interface StartupOptions {
  version: string
  pid: number
  configPath?: string
  host?: string
  port?: string | number
  plugins?: string[]
}

export interface ShutdownOptions {
  pid: number
  signal?: string
  uptime?: number
}

const BANNER_LINES = [
  '  ╔══════════════════════════════════════╗',
  '  ║          S P A K   S E R V E R       ║',
  '  ╚══════════════════════════════════════╝',
]

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h}h ${m}m ${s}s`
}

/** Emit the startup banner and key runtime info. Called once after the app starts. */
export function logStartup(options: StartupOptions): void {
  const logger = createLogger('spak')
  const lines: string[] = []

  for (const line of BANNER_LINES) {
    lines.push(ANSI.cyan + line + ANSI.reset)
  }

  lines.push(`  ${ANSI.green}✓${ANSI.reset} Spak v${options.version} started (pid=${options.pid})`)
  if (options.configPath) {
    lines.push(`  ${ANSI.gray}config:${ANSI.reset} ${options.configPath}`)
  }
  if (options.host && options.port) {
    lines.push(`  ${ANSI.gray}listening:${ANSI.reset} ${options.host}:${options.port}`)
  }
  if (options.plugins && options.plugins.length > 0) {
    lines.push(`  ${ANSI.gray}plugins:${ANSI.reset} ${options.plugins.join(', ')}`)
  }

  for (const line of lines) {
    // Use console directly for the banner — this is the ONE place where
    // direct console output is allowed (the startup banner).
    process.stdout.write(line + '\n')
  }

  logger.info(`Spak v${options.version} started (pid=${options.pid})`)
}

/** Emit the shutdown message. Called once when the app is stopping. */
export function logShutdown(options: ShutdownOptions): void {
  const logger = createLogger('spak')
  const signal = options.signal || 'SIGTERM'
  const uptime = options.uptime != null ? formatUptime(options.uptime) : '?'

  const line = `  ${ANSI.yellow}◇${ANSI.reset} Spak shutting down (pid=${options.pid}, signal=${signal}, uptime=${uptime})`
  process.stdout.write(line + '\n')

  logger.info(`Spak shutting down (pid=${options.pid}, signal=${signal}, uptime=${uptime})`)
}

export default {
  LogLevel,
  LEVEL_NAMES,
  Logger,
  Transport,
  ConsoleTransport,
  FileTransport,
  StreamTransport,
  createLogger,
  configureLogger,
  getLoggerConfig,
  attachCordis,
  defaultFormatter,
  colorFormatter,
  logStartup,
  logShutdown,
}
