/** Increasing verbosity. `silent` disables output. */
export declare enum LogLevel {
    silent = 0,
    error = 1,
    warn = 2,
    info = 3,
    debug = 4,
    trace = 5
}
export declare const LEVEL_NAMES: Record<number, string>;
export interface LogRecord {
    level: LogLevel;
    scope: string;
    message: string;
    args: any[];
    time: Date;
}
export declare function isDebugMode(): boolean;
export declare function setDebugMode(enabled: boolean): void;
export type Formatter = (record: LogRecord) => string;
/** Plain formatter: `2026-07-29T... INFO [scope] message args` */
export declare function defaultFormatter(record: LogRecord): string;
/** Simple formatter (CLI mode): `[I] message` or `[W] message` */
export declare function simpleFormatter(record: LogRecord): string;
/** Colored formatter for TTY consoles. */
export declare function colorFormatter(record: LogRecord): string;
export declare abstract class Transport {
    /** Minimum level this transport will emit. Independent of global level. */
    level: LogLevel;
    abstract render(record: LogRecord): void;
}
/** Writes colored output to process.stdout (info+) / process.stderr (error/warn). */
export declare class ConsoleTransport extends Transport {
    formatter: Formatter;
    constructor(formatter?: Formatter);
    render(record: LogRecord): void;
}
export declare function getGlobalFormatter(): Formatter;
export declare function setGlobalFormatter(formatter: Formatter): void;
export declare function initFormatter(): void;
export interface FileTransportOptions {
    /** Target log file path (relative to CWD resolved). */
    path: string;
    /** Max bytes before rotation. Default 5 MB. */
    maxSize?: number;
    formatter?: Formatter;
}
/** Appends formatted lines to a file with size-based rotation. */
export declare class FileTransport extends Transport {
    private readonly filePath;
    private readonly maxSize;
    formatter: Formatter;
    constructor(options: FileTransportOptions);
    render(record: LogRecord): void;
    private maybeRotate;
}
/** Writes formatted lines to any object with a `write(str)` method. */
export declare class StreamTransport extends Transport {
    stream: {
        write: (s: string) => boolean;
    };
    formatter: Formatter;
    constructor(stream: {
        write: (s: string) => boolean;
    }, formatter?: Formatter);
    render(record: LogRecord): void;
}
export interface LoggerOptions {
    level?: LogLevel;
    transports?: Transport[];
    formatter?: Formatter;
}
/** Configure the global logger registry. Replaces only the fields you pass. */
export declare function configureLogger(options: LoggerOptions): void;
/** Read the current global logger configuration. */
export declare function getLoggerConfig(): {
    level: LogLevel;
    transports: Transport[];
    formatter: Formatter;
};
export declare class Logger {
    scope: string;
    /** Per-instance override; falls back to the global level. */
    level?: LogLevel | undefined;
    constructor(scope?: string, 
    /** Per-instance override; falls back to the global level. */
    level?: LogLevel | undefined);
    private dispatch;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    trace(message: string, ...args: any[]): void;
}
/** Create a scoped logger instance. */
export declare function createLogger(scope?: string, level?: LogLevel): Logger;
export interface CordisAttachment {
    /** Remove the forwarder previously installed by `attachCordis`. */
    detach: () => void;
}
export declare function attachCordis(cordisLoggerModule: any): CordisAttachment;
export interface StartupOptions {
    version: string;
    pid: number;
    configPath?: string;
    host?: string;
    port?: string | number;
    plugins?: string[];
}
export interface ShutdownOptions {
    pid: number;
    signal?: string;
    uptime?: number;
}
/** Emit the startup banner and key runtime info. Called once after the app starts. */
export declare function logStartup(options: StartupOptions): void;
/** Emit the shutdown message. Called once when the app is stopping. */
export declare function logShutdown(options: ShutdownOptions): void;
declare const _default: {
    LogLevel: typeof LogLevel;
    LEVEL_NAMES: Record<number, string>;
    Logger: typeof Logger;
    Transport: typeof Transport;
    ConsoleTransport: typeof ConsoleTransport;
    FileTransport: typeof FileTransport;
    StreamTransport: typeof StreamTransport;
    createLogger: typeof createLogger;
    configureLogger: typeof configureLogger;
    getLoggerConfig: typeof getLoggerConfig;
    attachCordis: typeof attachCordis;
    defaultFormatter: typeof defaultFormatter;
    colorFormatter: typeof colorFormatter;
    logStartup: typeof logStartup;
    logShutdown: typeof logShutdown;
};
export default _default;
//# sourceMappingURL=index.d.ts.map