"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("@spakjs/util");
const path_1 = require("path");
const kleur_1 = __importDefault(require("kleur"));
const promises_1 = require("fs/promises");
const i18n_1 = require("@spakjs/i18n");
// CPC module whitelist check is ALWAYS executed on startup regardless of
// cpc.enabled. This is intentional — loading untrusted modules must be
// blocked at the framework level before ANY user plugin code runs.
const cpc_1 = require("../commands/cpc");
const log_1 = require("@spakjs/log");
process.env.SPAK_SHARED = JSON.stringify({
    startTime: Date.now(),
});
const PID_FILE = (0, path_1.join)((0, util_1.projectDataDir)(), '.spak.pid');
async function getRunningPid() {
    try {
        const data = await (0, promises_1.readFile)(PID_FILE, 'utf8');
        const pid = parseInt(data.trim(), 10);
        if (isNaN(pid))
            return null;
        try {
            process.kill(pid, 0);
            return pid;
        }
        catch {
            return null;
        }
    }
    catch {
        return null;
    }
}
async function savePid(pid) {
    await (0, promises_1.writeFile)(PID_FILE, String(pid), 'utf8');
}
async function stopService(signal = 'SIGTERM') {
    const pid = await getRunningPid();
    if (!pid) {
        console.log(kleur_1.default.yellow((0, i18n_1.T)("spak.cli.serve.not_running")));
        return false;
    }
    try {
        process.kill(pid, signal);
        console.log(kleur_1.default.green((0, i18n_1.T)("spak.cli.stop.sent", { signal: String(signal), pid: String(pid) })));
        try {
            await (0, promises_1.unlink)(PID_FILE);
        }
        catch { }
        return true;
    }
    catch (err) {
        console.error(kleur_1.default.red((0, i18n_1.T)("spak.cli.stop.failed", { pid: String(pid), error: String(err) })));
        return false;
    }
}
async function killService() {
    return stopService('SIGKILL');
}
async function injectLanguageDeps() {
    const { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } = await Promise.resolve().then(() => __importStar(require('fs')));
    const { resolve } = await Promise.resolve().then(() => __importStar(require('path')));
    const packagesDir = resolve(process.cwd(), 'packages');
    if (!existsSync(packagesDir))
        return;
    const packages = readdirSync(packagesDir).filter((d) => {
        const p = resolve(packagesDir, d);
        return statSync(p).isDirectory() && existsSync(resolve(p, 'package.json'));
    });
    for (const pkg of packages) {
        const pkgPath = resolve(packagesDir, pkg, 'package.json');
        try {
            const data = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            if (!data.dependencies)
                data.dependencies = {};
            // NOTE: @spakjs/locales was merged into @spakjs/i18n (MODULE_DIVISION §2.3).
            // Use workspace:^ range which is the pnpm monorepo canonical spec.
            const targetPkg = '@spakjs/i18n';
            if (!data.dependencies[targetPkg]) {
                data.dependencies[targetPkg] = 'workspace:^';
                writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
                console.log(`[inject] ${(0, i18n_1.T)('spak.cli.inject.added', { pkg })}`);
            }
            const localesDir = resolve(packagesDir, pkg, 'locales');
            if (!existsSync(localesDir)) {
                mkdirSync(localesDir, { recursive: true });
                writeFileSync(resolve(localesDir, 'en-US.yml'), '# Empty locale\n', 'utf-8');
                console.log(`[inject] ${(0, i18n_1.T)('spak.cli.inject.created', { pkg })}`);
            }
            else if (!existsSync(resolve(localesDir, 'en-US.yml'))) {
                writeFileSync(resolve(localesDir, 'en-US.yml'), '# Empty locale\n', 'utf-8');
                console.log(`[inject] ${(0, i18n_1.T)('spak.cli.inject.created', { pkg })}`);
            }
        }
        catch (err) {
            if (process.env.SPAK_DEBUG)
                console.debug('[init-locales] pkg:', pkg, err?.message ?? String(err));
        }
    }
}
async function startService(file) {
    // ==================================================================
    // DEBUG MODE — Enable detailed logging if requested
    // ==================================================================
    const isDebug = process.env.SPAK_DEBUG === 'true' || process.env.SPAK_LOG_TIME;
    if (isDebug) {
        (0, log_1.setDebugMode)(true);
    }
    await savePid(process.pid);
    // ==================================================================
    // HARD GUARD — CPC module whitelist (always enforced, even without
    // cpc.enabled=true in config). Unauthorized packages/plugins cause
    // process.exit(1) from inside runModuleWhitelistCheck.
    // ==================================================================
    (0, cpc_1.runModuleWhitelistCheck)(true);
    // Normalize ESM / CJS / named-export shapes so that `new NodeLoader()`
    // always works regardless of how the loader module is bundled.
    const mod = await Promise.resolve().then(() => __importStar(require('@spakjs/loader')));
    const NodeLoader = mod.default?.default ?? mod.default ?? mod.NodeLoader ?? mod;
    const loader = new NodeLoader();
    try {
        await loader.init(file);
        await loader.readConfig(true);
    }
    catch (err) {
        console.error(`${kleur_1.default.red('[CLI]')} ${(0, i18n_1.T)('spak.cli.start.read_config_failed', { error: `${err.stack || err.message}` })}`);
        throw err;
    }
    // Host/port env overrides are applied directly via process.env
    // (SPAK_HOST / SPAK_PORT), consumed by server-style plugins.
    const app = await loader.createApp();
    await app.start();
    console.log(kleur_1.default.green((0, i18n_1.T)("spak.cli.serve.started", { pid: String(process.pid) })));
    const onSignal = async (signal) => {
        console.log(kleur_1.default.yellow(`\n${(0, i18n_1.T)("spak.cli.serve.stopping", { signal: String(signal) })}`));
        await app.parallel('exit', signal);
        try {
            await (0, promises_1.unlink)(PID_FILE);
        }
        catch { }
        process.exit(0);
    };
    process.on('SIGINT', () => onSignal('SIGINT'));
    process.on('SIGTERM', () => onSignal('SIGTERM'));
    if (!app.scope.runtime.children.length) {
        // Keep the Node.js event loop alive. A periodic no-op timer is used
        // instead of process.stdin.resume() so the server survives both
        // foreground and background (setsid/nohup, stdin=/dev/null) runs,
        // and still terminates cleanly via the SIGINT/SIGTERM handlers above.
        setInterval(() => { }, 1000);
    }
}
async function statusService() {
    const pid = await getRunningPid();
    if (!pid) {
        console.log(kleur_1.default.red((0, i18n_1.T)("spak.cli.status.not_running")));
        return;
    }
    let port = '?';
    let uptime = '?';
    let memUsage = '?';
    let cpuUsage = '?';
    let nodeVersion = process.version;
    let platform = `${process.platform} ${process.arch}`;
    let hostname = '?';
    let totalMem = '?';
    let freeMem = '?';
    let loadAvg = [];
    let requestCount = 0;
    let pluginCount = 0;
    try {
        const logData = await (0, promises_1.readFile)('spak.log', 'utf-8');
        const portMatch = logData.match(/listening at http:\/\/([^:]+):(\d+)/);
        if (portMatch)
            port = portMatch[2];
        const requests = logData.match(/\[REQUEST\]|\[HTTP\]|request|response/gi);
        requestCount = requests ? requests.length : 0;
        const plugins = logData.match(/apply plugin/g);
        pluginCount = plugins ? plugins.length : 0;
    }
    catch (err) {
        if (process.env.SPAK_DEBUG)
            console.debug('[status] read spak.log failed:', err?.message ?? String(err));
    }
    try {
        const os = await Promise.resolve().then(() => __importStar(require('os')));
        hostname = os.hostname();
        totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1) + ' GB';
        freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1) + ' GB';
        loadAvg = os.loadavg();
    }
    catch (err) {
        if (process.env.SPAK_DEBUG)
            console.debug('[status] os module failed:', err?.message ?? String(err));
    }
    try {
        memUsage = ((process.memoryUsage().rss / 1024 / 1024).toFixed(1)) + ' MB';
        cpuUsage = (process.cpuUsage().user / 1000000).toFixed(2) + 's';
        const running = process.uptime();
        const hours = Math.floor(running / 3600);
        const mins = Math.floor((running % 3600) / 60);
        const secs = Math.floor(running % 60);
        uptime = `${hours}h ${mins}m ${secs}s`;
    }
    catch (err) {
        if (process.env.SPAK_DEBUG)
            console.debug('[status] runtime stats failed:', err?.message ?? String(err));
    }
    const line = '─'.repeat(40);
    console.log();
    console.log(`  ${kleur_1.default.green('●')} ${kleur_1.default.bold((0, i18n_1.T)('spak.cli.status.title'))} `);
    console.log(`  ${line}`);
    console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cli.status.service'))}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.pid_value', { pid: String(pid) })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.port_value', { port })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.uptime_value', { uptime })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.plugins_value', { count: String(pluginCount) })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.requests_value', { count: String(requestCount) })}`);
    console.log();
    console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cli.status.hardware'))}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.memory_value', { used: memUsage, total: totalMem })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.free_value', { free: freeMem })}`);
    if (loadAvg.length >= 3) {
        console.log(`  ${(0, i18n_1.T)('spak.cli.status.load_value', { load: `${loadAvg[0].toFixed(2)}, ${loadAvg[1].toFixed(2)}, ${loadAvg[2].toFixed(2)}` })}`);
    }
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.cpu_value', { usage: cpuUsage })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.platform_value', { platform })}`);
    console.log();
    console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cli.status.environment'))}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.host_value', { host: hostname })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.node_value', { version: nodeVersion })}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.log_value')}`);
    console.log(`  ${(0, i18n_1.T)('spak.cli.status.pid_file_value')}`);
    console.log(`  ${line}`);
    console.log();
}
const serveDeclarations = [
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
            const file = args.file;
            const { logLevel, debug, logTime, host, port, stop, restart, kill, noSandbox } = options;
            if (kill) {
                await killService();
                return;
            }
            if (stop) {
                await stopService();
                return;
            }
            if (restart) {
                await stopService('SIGTERM');
                await new Promise(resolve => setTimeout(resolve, 1000));
                try {
                    await (0, promises_1.unlink)(PID_FILE);
                }
                catch { }
            }
            if (noSandbox)
                process.env.SPAK_NO_SANDBOX = '1';
            // Enable debug mode if log.debug is set
            if (options.debug === 'true') {
                (0, log_1.setDebugMode)(true);
            }
            process.env.SPAK_LOG_TIME = logTime || '';
            process.env.SPAK_LOG_TIME = logTime || '';
            process.env.SPAK_LOG_LEVEL = logLevel || '';
            process.env.SPAK_DEBUG = debug || '';
            process.env.SPAK_CONFIG_FILE = file || '';
            if (host)
                process.env.SPAK_HOST = host;
            if (port)
                process.env.SPAK_PORT = String(port);
            if (process.env.SPAK_LOG_LEVEL && (!(0, util_1.isInteger)(Number(process.env.SPAK_LOG_LEVEL)) || Number(process.env.SPAK_LOG_LEVEL) < 0)) {
                console.warn(`${kleur_1.default.red((0, i18n_1.T)("spak.general.error"))} ${(0, i18n_1.T)("spak.general.invalid_log_level")}`);
                process.exit(1);
            }
            await startService(file).catch((error) => {
                console.error(kleur_1.default.red((0, i18n_1.T)("spak.cli.serve.start_failed", { error: String(error) })));
                process.exit(1);
            });
        },
    },
    {
        command: 'serve status',
        description: 'show spak service status',
        action: async () => {
            await statusService();
        },
    },
    {
        command: 'init-locales',
        description: 'inject @spakjs/locales dependency and create empty locales dir for each package in workspace',
        action: async () => {
            await injectLanguageDeps();
        },
    },
];
exports.default = serveDeclarations;
//# sourceMappingURL=start.js.map