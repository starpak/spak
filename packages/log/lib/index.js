"use strict";
// ===== @spakjs/log — multi-transport logger =====
//
// Independent of @spakjs/core (no circular dependency). May use Node IO
// (fs/path) for the file transport, so this package is Node-only — same
// tier as @spakjs/loader and @spakjs/config, NOT the zero-side-effect
// util/message tier.
//
// Zero third-party dependencies: usable by anyone, not just spak users.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.StreamTransport = exports.FileTransport = exports.ConsoleTransport = exports.Transport = exports.LEVEL_NAMES = exports.LogLevel = void 0;
exports.isDebugMode = isDebugMode;
exports.setDebugMode = setDebugMode;
exports.defaultFormatter = defaultFormatter;
exports.simpleFormatter = simpleFormatter;
exports.colorFormatter = colorFormatter;
exports.getGlobalFormatter = getGlobalFormatter;
exports.setGlobalFormatter = setGlobalFormatter;
exports.initFormatter = initFormatter;
exports.configureLogger = configureLogger;
exports.getLoggerConfig = getLoggerConfig;
exports.createLogger = createLogger;
exports.attachCordis = attachCordis;
exports.logStartup = logStartup;
exports.logShutdown = logShutdown;
const fs_1 = require("fs");
const path_1 = require("path");
// ===== Levels =====
/** Increasing verbosity. `silent` disables output. */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["silent"] = 0] = "silent";
    LogLevel[LogLevel["error"] = 1] = "error";
    LogLevel[LogLevel["warn"] = 2] = "warn";
    LogLevel[LogLevel["info"] = 3] = "info";
    LogLevel[LogLevel["debug"] = 4] = "debug";
    LogLevel[LogLevel["trace"] = 5] = "trace";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
exports.LEVEL_NAMES = {
    1: 'ERROR',
    2: 'WARN',
    3: 'INFO',
    4: 'DEBUG',
    5: 'TRACE',
};
// ===== Debug Mode =====
/** Global debug mode flag. When true, logs include full timestamp, scope, and detailed info. */
let _debugMode = false;
let _initialized = false;
function isDebugMode() {
    return _debugMode;
}
function setDebugMode(enabled) {
    _debugMode = enabled;
    if (!_initialized) {
        initFormatter();
    }
}
function formatArg(arg) {
    if (arg instanceof Error)
        return arg.stack || arg.message;
    if (typeof arg === 'string')
        return arg;
    try {
        return JSON.stringify(arg);
    }
    catch {
        return String(arg);
    }
}
/** Plain formatter: `2026-07-29T... INFO [scope] message args` */
function defaultFormatter(record) {
    const time = record.time.toISOString();
    const level = (exports.LEVEL_NAMES[record.level] || 'LOG').padEnd(5);
    const scope = record.scope ? `[${record.scope}]` : '';
    const args = record.args.length ? ' ' + record.args.map(formatArg).join(' ') : '';
    return `${time} ${level} ${scope} ${record.message}${args}`;
}
/** Simple formatter (CLI mode): `[I] message` or `[W] message` */
function simpleFormatter(record) {
    const level = (exports.LEVEL_NAMES[record.level] || 'LOG').padStart(2, ' ');
    const prefix = `[${level}]`;
    return `${prefix} ${record.message}`;
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
};
const LEVEL_COLORS = {
    1: ANSI.red,
    2: ANSI.yellow,
    3: ANSI.green,
    4: ANSI.cyan,
    5: ANSI.magenta,
};
/** Colored formatter for TTY consoles. */
function colorFormatter(record) {
    const time = ANSI.gray + record.time.toISOString() + ANSI.reset;
    const color = LEVEL_COLORS[record.level] || '';
    const level = color + (exports.LEVEL_NAMES[record.level] || 'LOG').padEnd(5) + ANSI.reset;
    const scope = record.scope ? ANSI.gray + '[' + record.scope + ']' + ANSI.reset : '';
    const args = record.args.length ? ' ' + record.args.map(formatArg).join(' ') : '';
    return `${time} ${level} ${scope} ${record.message}${args}`;
}
// ===== Transport =====
class Transport {
    /** Minimum level this transport will emit. Independent of global level. */
    level = LogLevel.info;
}
exports.Transport = Transport;
/** Writes colored output to process.stdout (info+) / process.stderr (error/warn). */
class ConsoleTransport extends Transport {
    formatter;
    constructor(formatter = colorFormatter) {
        super();
        this.formatter = formatter;
    }
    render(record) {
        const text = this.formatter(record) + '\n';
        if (record.level <= LogLevel.error) {
            process.stderr.write(text);
        }
        else {
            process.stdout.write(text);
        }
    }
}
exports.ConsoleTransport = ConsoleTransport;
// Global formatter selection
let _globalFormatter = simpleFormatter;
function getGlobalFormatter() {
    return _globalFormatter;
}
function setGlobalFormatter(formatter) {
    _globalFormatter = formatter;
}
// Initialize global formatter (will be set by CLI on startup)
function initFormatter() {
    // Default to simple formatter (normal mode)
    // Debug mode is set via setDebugMode() which will be called by CLI
    if (isDebugMode()) {
        _globalFormatter = defaultFormatter;
    }
    else {
        _globalFormatter = simpleFormatter;
    }
}
/** Appends formatted lines to a file with size-based rotation. */
class FileTransport extends Transport {
    filePath;
    maxSize;
    formatter;
    constructor(options) {
        super();
        this.filePath = (0, path_1.resolve)(options.path);
        this.maxSize = options.maxSize ?? 5 * 1024 * 1024;
        this.formatter = options.formatter ?? defaultFormatter;
    }
    render(record) {
        const text = this.formatter(record) + '\n';
        try {
            this.maybeRotate();
            (0, fs_1.appendFileSync)(this.filePath, text, 'utf8');
        }
        catch {
            // logging must never throw — swallow
        }
    }
    maybeRotate() {
        try {
            if (!(0, fs_1.existsSync)(this.filePath))
                return;
            if ((0, fs_1.statSync)(this.filePath).size >= this.maxSize) {
                (0, fs_1.renameSync)(this.filePath, `${this.filePath}.${Date.now()}`);
            }
        }
        catch {
            // rotation failure must not stop logging
        }
    }
}
exports.FileTransport = FileTransport;
/** Writes formatted lines to any object with a `write(str)` method. */
class StreamTransport extends Transport {
    stream;
    formatter;
    constructor(stream, formatter = defaultFormatter) {
        super();
        this.stream = stream;
        this.formatter = formatter;
    }
    render(record) {
        this.stream.write(this.formatter(record) + '\n');
    }
}
exports.StreamTransport = StreamTransport;
// ===== Global config =====
let globalLevel = LogLevel.info;
let globalTransports = [];
let globalFormatter = defaultFormatter;
const defaultConsoleTransport = new ConsoleTransport();
/** Configure the global logger registry. Replaces only the fields you pass. */
function configureLogger(options) {
    if (options.level !== undefined)
        globalLevel = options.level;
    if (options.transports !== undefined)
        globalTransports = options.transports;
    if (options.formatter !== undefined)
        globalFormatter = options.formatter;
}
/** Read the current global logger configuration. */
function getLoggerConfig() {
    return { level: globalLevel, transports: globalTransports, formatter: globalFormatter };
}
// ===== Logger =====
class Logger {
    scope;
    level;
    constructor(scope = '', 
    /** Per-instance override; falls back to the global level. */
    level) {
        this.scope = scope;
        this.level = level;
    }
    dispatch(level, message, args) {
        const effective = this.level ?? globalLevel;
        if (level <= LogLevel.silent || level > effective)
            return;
        const record = { level, scope: this.scope, message, args, time: new Date() };
        const targets = globalTransports.length ? globalTransports : [defaultConsoleTransport];
        for (const t of targets) {
            if (level <= t.level)
                t.render(record);
        }
    }
    error(message, ...args) {
        this.dispatch(LogLevel.error, message, args);
    }
    warn(message, ...args) {
        this.dispatch(LogLevel.warn, message, args);
    }
    info(message, ...args) {
        this.dispatch(LogLevel.info, message, args);
    }
    debug(message, ...args) {
        this.dispatch(LogLevel.debug, message, args);
    }
    trace(message, ...args) {
        this.dispatch(LogLevel.trace, message, args);
    }
}
exports.Logger = Logger;
/** Create a scoped logger instance. */
function createLogger(scope, level) {
    return new Logger(scope, level);
}
function attachCordis(cordisLoggerModule) {
    const LoggerClass = cordisLoggerModule?.Logger ?? cordisLoggerModule;
    const noop = { detach: () => { } };
    if (!LoggerClass || !Array.isArray(LoggerClass.targets))
        return noop;
    // Map cordis level strings/numbers to our LogLevel enum. The mapping is a
    // superset on purpose — different cordis versions pass different values.
    // Note: `silly`/`fatal`/`success` are NOT part of the official LogLevel
    // enum to preserve backwards compatibility — they are mapped to the
    // closest matching level instead.
    const toLevel = (lv) => {
        switch (typeof lv === 'number' ? lv : String(lv || 'info').toLowerCase()) {
            case 0:
            case 'silly': return LogLevel.trace;
            case 1:
            case 'debug':
            case 'trace': return LogLevel.debug;
            case 2:
            case 'info':
            case 'log':
            case 'success': return LogLevel.info;
            case 3:
            case 'warn':
            case 'warning': return LogLevel.warn;
            case 4:
            case 'error':
            case 'err':
            case 'fatal': return LogLevel.error;
            case 5:
            case 6: return LogLevel.error;
            default: return LogLevel.info;
        }
    };
    // cordis target contract: `print(text, level?)` or `print(record)` — we
    // probe the call arity and the shape of the first argument to detect
    // structured records vs plain text.
    const forwarder = {
        colors: false,
        print: function (firstArg, secondArg) {
            // Structured record, e.g. { level, message, scope, ... }
            if (firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg)) {
                const stripped = String(firstArg.message ?? firstArg.msg ?? '').replace(/\x1b\[[0-9;]*m/g, '').trimEnd();
                if (!stripped)
                    return;
                const level = toLevel(firstArg.level);
                const record = {
                    level,
                    scope: firstArg.scope ?? firstArg.name ?? 'cordis',
                    message: stripped,
                    args: firstArg.args ?? [],
                    time: new Date(),
                };
                const targets = globalTransports.length ? globalTransports : [defaultConsoleTransport];
                for (const t of targets) {
                    if (level <= t.level)
                        t.render(record);
                }
                return;
            }
            const stripped = String(firstArg ?? '').replace(/\x1b\[[0-9;]*m/g, '').trimEnd();
            if (!stripped)
                return;
            const level = arguments.length >= 2 ? toLevel(secondArg) : LogLevel.info;
            const record = {
                level,
                scope: 'cordis',
                message: stripped,
                args: [],
                time: new Date(),
            };
            const targets = globalTransports.length ? globalTransports : [defaultConsoleTransport];
            for (const t of targets) {
                if (level <= t.level)
                    t.render(record);
            }
        },
    };
    LoggerClass.targets.push(forwarder);
    return {
        detach() {
            const i = LoggerClass.targets.indexOf(forwarder);
            if (i >= 0)
                LoggerClass.targets.splice(i, 1);
        },
    };
}
const BANNER_LINES = [
    '  ╔══════════════════════════════════════╗',
    '  ║          S P A K   S E R V E R       ║',
    '  ╚══════════════════════════════════════╝',
];
function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}
/** Emit the startup banner and key runtime info. Called once after the app starts. */
function logStartup(options) {
    const logger = createLogger('spak');
    const lines = [];
    for (const line of BANNER_LINES) {
        lines.push(ANSI.cyan + line + ANSI.reset);
    }
    lines.push(`  ${ANSI.green}✓${ANSI.reset} Spak v${options.version} started (pid=${options.pid})`);
    if (options.configPath) {
        lines.push(`  ${ANSI.gray}config:${ANSI.reset} ${options.configPath}`);
    }
    if (options.host && options.port) {
        lines.push(`  ${ANSI.gray}listening:${ANSI.reset} ${options.host}:${options.port}`);
    }
    if (options.plugins && options.plugins.length > 0) {
        lines.push(`  ${ANSI.gray}plugins:${ANSI.reset} ${options.plugins.join(', ')}`);
    }
    for (const line of lines) {
        // Use console directly for the banner — this is the ONE place where
        // direct console output is allowed (the startup banner).
        process.stdout.write(line + '\n');
    }
    logger.info(`Spak v${options.version} started (pid=${options.pid})`);
}
/** Emit the shutdown message. Called once when the app is stopping. */
function logShutdown(options) {
    const logger = createLogger('spak');
    const signal = options.signal || 'SIGTERM';
    const uptime = options.uptime != null ? formatUptime(options.uptime) : '?';
    const line = `  ${ANSI.yellow}◇${ANSI.reset} Spak shutting down (pid=${options.pid}, signal=${signal}, uptime=${uptime})`;
    process.stdout.write(line + '\n');
    logger.info(`Spak shutting down (pid=${options.pid}, signal=${signal}, uptime=${uptime})`);
}
exports.default = {
    LogLevel,
    LEVEL_NAMES: exports.LEVEL_NAMES,
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
};
//# sourceMappingURL=index.js.map