"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakers = void 0;
exports.runModuleWhitelistCheck = runModuleWhitelistCheck;
exports.isAvailable = isAvailable;
exports.ensureAvailable = ensureAvailable;
exports.initCPC = initCPC;
exports.triggerCircuitBreaker = triggerCircuitBreaker;
exports.restoreCircuitBreaker = restoreCircuitBreaker;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("@spakjs/config");
const kleur_1 = __importDefault(require("kleur"));
const i18n_1 = require("@spakjs/i18n");
// ====== Plugin Check ======
const BUILTIN_PACKAGES_DIR = (0, path_1.resolve)(process.cwd(), 'packages');
const PLUGINS_DIR = (0, path_1.resolve)(process.cwd(), 'plugins');
// ============================================================
// 🛡️ MODULE WHITELIST — Authorized modules ONLY
// Any package/plugin discovered at runtime MUST be present in
// this list; otherwise CPC triggers a hard process exit so the
// main framework refuses to start with untrusted code.
// ============================================================
const MODULE_WHITELIST = new Set([
    // --- Core @spakjs packages (monorepo internal) ---
    '@spakjs/util',
    '@spakjs/message',
    '@spakjs/log',
    '@spakjs/config',
    '@spakjs/core',
    '@spakjs/i18n',
    '@spakjs/loader',
    '@spakjs/agent',
    '@spakjs/cli',
    '@spakjs/node-b',
    'util',
    'message',
    'log',
    'config',
    'core',
    'i18n',
    'loader',
    'agent',
    'cli',
    'node-b',
    // --- Known/approved @spakjs plugins ---
    '@spakjs/plugin-server',
    '@spakjs/plugin-http',
    '@spakjs/plugin-hmr',
    '@spakjs/plugin-daemon',
    'plugin-server',
    'plugin-http',
    'plugin-hmr',
    'plugin-daemon',
]);
/**
 * Run the whitelist validation step.
 *
 * Discovers every builtin package under /packages and every plugin
 * under /plugins, then verifies each name appears in the hard-coded
 * MODULE_WHITELIST above.
 *
 * If ANY unauthorized module is found:
 *   1. log each offending name via T('spak.cpc.check.whitelist_unknown_module')
 *   2. log a final violation summary
 *   3. call process.exit(1) immediately so the framework cannot boot
 *
 * Returns silently when everything is authorized.
 */
function runModuleWhitelistCheck(failHard = true) {
    console.log(kleur_1.default.cyan(`\n  ${(0, i18n_1.T)('spak.cpc.check.whitelist_checking')}\n`));
    const discovered = [];
    // Collect builtin packages (scanned by /packages directory).
    if ((0, fs_1.existsSync)(BUILTIN_PACKAGES_DIR)) {
        const pkgs = (0, fs_1.readdirSync)(BUILTIN_PACKAGES_DIR).filter(d => (0, fs_1.statSync)((0, path_1.resolve)(BUILTIN_PACKAGES_DIR, d)).isDirectory());
        for (const p of pkgs) {
            discovered.push(p);
            // Also add the @spakjs/ scoped form so we accept directory name AND
            // the full published package name convention in the whitelist.
            discovered.push(`@spakjs/${p}`);
        }
    }
    // Collect plugins (scanned by /plugins directory).
    if ((0, fs_1.existsSync)(PLUGINS_DIR)) {
        const plugs = (0, fs_1.readdirSync)(PLUGINS_DIR).filter(d => (0, fs_1.statSync)((0, path_1.resolve)(PLUGINS_DIR, d)).isDirectory());
        for (const p of plugs) {
            discovered.push(p);
            discovered.push(`@spakjs/${p}`);
        }
    }
    // Also honour any user-added extra modules declared in config via
    // cpc.whitelist array, so users can self-approve without editing
    // this source file. Fail silently if config loading errors.
    let extraWhitelist = [];
    try {
        const cfg = (0, config_1.loadConfig)();
        if (Array.isArray(cfg?.cpc?.whitelist))
            extraWhitelist = cfg.cpc.whitelist;
    }
    catch { /* ignore */ }
    const effectiveWhitelist = new Set([...MODULE_WHITELIST, ...extraWhitelist]);
    const uniqueModules = [...new Set(discovered)];
    const unauthorized = uniqueModules.filter(name => !effectiveWhitelist.has(name));
    if (unauthorized.length > 0) {
        for (const name of unauthorized) {
            console.log(`  ${kleur_1.default.red('✗')} ${(0, i18n_1.T)('spak.cpc.check.whitelist_unknown_module', { name })}`);
        }
        console.log(kleur_1.default.red(`\n  ${(0, i18n_1.T)('spak.cpc.check.whitelist_violation', { count: String(unauthorized.length) })}\n`));
        if (failHard) {
            // Deliberately crash the main framework process. Using exit(1)
            // guarantees any caller (CLI serve, programmatic createApp, tests)
            // observes a non-zero status and cannot continue.
            process.exit(1);
        }
    }
    else {
        console.log(`  ${kleur_1.default.green('✓')} ${(0, i18n_1.T)('spak.cpc.check.whitelist_passed', {
            count: String(uniqueModules.length),
            total: String(uniqueModules.length),
        })}\n`);
    }
    return { unauthorized, total: uniqueModules.length };
}
function checkBuiltinPackage(name) {
    const pkgDir = (0, path_1.resolve)(BUILTIN_PACKAGES_DIR, name);
    const requiredDirs = ['src'];
    const requiredFiles = ['package.json'];
    if (!(0, fs_1.existsSync)(pkgDir)) {
        return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.pkg_not_found') };
    }
    for (const dir of requiredDirs) {
        if (!(0, fs_1.existsSync)((0, path_1.resolve)(pkgDir, dir))) {
            return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.missing_dir', { dir }) };
        }
    }
    for (const file of requiredFiles) {
        if (!(0, fs_1.existsSync)((0, path_1.resolve)(pkgDir, file))) {
            return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.missing_file', { file }) };
        }
    }
    return { name, valid: true };
}
function checkPlugin(name) {
    const pluginDir = (0, path_1.resolve)(PLUGINS_DIR, name);
    if (!(0, fs_1.existsSync)(pluginDir)) {
        return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.plugin_not_found') };
    }
    const pkgPath = (0, path_1.resolve)(pluginDir, 'package.json');
    if (!(0, fs_1.existsSync)(pkgPath)) {
        return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.pkg_json_not_found') };
    }
    let pkg;
    try {
        pkg = JSON.parse((0, fs_1.readFileSync)(pkgPath, 'utf-8'));
    }
    catch {
        return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.invalid_pkg_json') };
    }
    // Check main entry
    if (pkg.main && !(0, fs_1.existsSync)((0, path_1.resolve)(pluginDir, pkg.main))) {
        return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.main_not_found', { main: pkg.main }) };
    }
    // Check dependencies (warn if missing)
    if (pkg.dependencies) {
        const missingDeps = [];
        for (const dep of Object.keys(pkg.dependencies)) {
            const depPath = (0, path_1.resolve)(process.cwd(), 'node_modules', dep);
            if (!(0, fs_1.existsSync)(depPath) && !dep.startsWith('@spakjs/')) {
                missingDeps.push(dep);
            }
        }
        if (missingDeps.length > 0) {
            return { name, valid: false, reason: (0, i18n_1.T)('spak.cpc.check.missing_deps', { deps: missingDeps.join(', ') }) };
        }
    }
    return { name, valid: true };
}
function runPluginCheck() {
    // Step 0 — Module whitelist validation. If this fails, process.exit(1)
    // is triggered inside runModuleWhitelistCheck itself; we never reach the
    // rest of runPluginCheck.
    runModuleWhitelistCheck(true);
    console.log(kleur_1.default.cyan(`\n  ${(0, i18n_1.T)('spak.cpc.check.starting')}\n`));
    // Check built-in packages
    const builtinPackages = (0, fs_1.readdirSync)(BUILTIN_PACKAGES_DIR).filter(d => {
        return (0, fs_1.statSync)((0, path_1.resolve)(BUILTIN_PACKAGES_DIR, d)).isDirectory();
    });
    let validCount = 0;
    let totalCount = 0;
    for (const pkg of builtinPackages) {
        totalCount++;
        const result = checkBuiltinPackage(pkg);
        if (result.valid) {
            validCount++;
            console.log(`  ${kleur_1.default.green('✓')} ${kleur_1.default.bold(pkg)}: ${result.reason || (0, i18n_1.T)('spak.cpc.check.ok')}`);
        }
        else {
            console.log(`  ${kleur_1.default.red('✗')} ${kleur_1.default.bold(pkg)}: ${result.reason}`);
        }
    }
    // Check external plugins
    if ((0, fs_1.existsSync)(PLUGINS_DIR)) {
        const plugins = (0, fs_1.readdirSync)(PLUGINS_DIR).filter(d => {
            return (0, fs_1.statSync)((0, path_1.resolve)(PLUGINS_DIR, d)).isDirectory();
        });
        for (const plugin of plugins) {
            totalCount++;
            const result = checkPlugin(plugin);
            if (result.valid) {
                validCount++;
                console.log(`  ${kleur_1.default.green('✓')} ${kleur_1.default.bold(plugin)}: ${(0, i18n_1.T)('spak.cpc.check.ok')}`);
            }
            else {
                console.log(`  ${kleur_1.default.red('✗')} ${kleur_1.default.bold(plugin)}: ${result.reason}`);
            }
        }
    }
    console.log(`\n  ${(0, i18n_1.T)('spak.cpc.check.complete', { valid: String(validCount), total: String(totalCount) })}\n`);
}
// ====== Sandbox ======
const sandboxProcesses = new Map();
function isolatePlugin(name) {
    if (process.env.SPAK_NO_SANDBOX === '1') {
        console.log(kleur_1.default.yellow(`  ⚠ ${(0, i18n_1.T)('spak.cpc.sandbox.disabled_warning')}`));
        return;
    }
    console.log(kleur_1.default.cyan(`  ${(0, i18n_1.T)('spak.cpc.sandbox.isolating', { name })}`));
    // Respect circuit breakers: if the plugin is in the open state, refuse to
    // isolate it — same behaviour as the runtime loader should use.
    if (circuitBreakers.get(name)) {
        console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.sandbox.isolation_aborted', { msg: (0, i18n_1.T)('spak.cpc.ssetps.circuit_open', { name }) })));
        return;
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
  `;
    const child = (0, child_process_1.spawn)(process.execPath, ['-e', workerScript, '--', name], {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        detached: true,
    });
    // Prevent accidental memory leaks from pending IPC buffers — we don't
    // forward raw stdio to the user's terminal (they are ignored above) but
    // we still want lifecycle notifications.
    child.on('error', (err) => {
        console.warn(kleur_1.default.yellow((0, i18n_1.T)('spak.cpc.sandbox.error', { name, error: String(err.message) })));
    });
    child.on('exit', (code) => {
        sandboxProcesses.delete(name);
    });
    sandboxProcesses.set(name, child);
    console.log(kleur_1.default.green(`  ${(0, i18n_1.T)('spak.cpc.sandbox.isolated', { name, pid: String(child.pid ?? -1) })}`));
}
function terminateSandbox(name) {
    const proc = sandboxProcesses.get(name);
    if (proc && proc.connected) {
        try {
            proc.send({ type: 'shutdown' });
        }
        catch { /* IPC already closed */ }
        // Fallback kill if graceful shutdown didn't happen within 500ms
        const killTimer = setTimeout(() => {
            if (proc.pid)
                try {
                    process.kill(proc.pid, 'SIGKILL');
                }
                catch { }
        }, 500);
        if (killTimer.unref)
            killTimer.unref();
    }
    else if (proc && proc.pid) {
        try {
            process.kill(proc.pid);
        }
        catch { }
    }
    if (proc) {
        const pid = proc.pid;
        sandboxProcesses.delete(name);
        console.log(kleur_1.default.yellow(`  ${(0, i18n_1.T)('spak.cpc.sandbox.terminated', { pid: String(pid ?? -1) })}`));
    }
}
// ====== SSetPS - Safety Set Protection System ======
let ssetpsInterval = null;
const DEFAULT_MEMORY_LIMIT_MB = 512;
let currentMemoryLimitMB = DEFAULT_MEMORY_LIMIT_MB;
const circuitBreakers = new Map();
exports.circuitBreakers = circuitBreakers;
let gcHintShown = false;
/**
 * Resolve the effective SSetPS memory limit (MB). Precedence:
 *   1. SPAK_SSETPS_MEMORY_LIMIT_MB env var (highest, deploy-time override)
 *   2. config.cpc.ssetps.memoryLimitMB (from user config)
 *   3. DEFAULT_MEMORY_LIMIT_MB = 512 (fallback, historic hard-coded value)
 */
function resolveMemoryLimitMB(userLimit) {
    const envVal = Number(process.env.SPAK_SSETPS_MEMORY_LIMIT_MB);
    if (Number.isFinite(envVal) && envVal > 0)
        return Math.floor(envVal);
    if (Number.isFinite(userLimit) && userLimit > 0)
        return Math.floor(userLimit);
    return DEFAULT_MEMORY_LIMIT_MB;
}
function startSSetPS(overrideLimitMB) {
    if (ssetpsInterval)
        return;
    currentMemoryLimitMB = resolveMemoryLimitMB(overrideLimitMB);
    console.log(kleur_1.default.cyan(`  ${(0, i18n_1.T)('spak.cpc.ssetps.monitoring')} ${kleur_1.default.dim(`(limit=${currentMemoryLimitMB}MB)`)}`));
    // Check if global.gc is available (--expose-gc flag required)
    if (typeof global.gc !== 'function' && !gcHintShown) {
        gcHintShown = true;
        console.log(kleur_1.default.yellow((0, i18n_1.T)('spak.cpc.ssetps.tip')));
    }
    ssetpsInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        const rssMB = memUsage.rss / 1024 / 1024;
        const limitMB = currentMemoryLimitMB;
        const usagePercent = (rssMB / limitMB) * 100;
        if (usagePercent > 80) {
            console.log(kleur_1.default.yellow(`  ${(0, i18n_1.T)('spak.cpc.ssetps.memory_warning', { usage: usagePercent.toFixed(1) })} ${kleur_1.default.dim(`[rss=${rssMB.toFixed(0)}/${limitMB}MB]`)}`));
            // Check if global.gc is available (--expose-gc flag required)
            if (typeof global.gc === 'function') {
                const before = process.memoryUsage().rss;
                global.gc();
                const after = process.memoryUsage().rss;
                const freed = (before - after) / 1024 / 1024;
                if (freed > 0) {
                    console.log(kleur_1.default.green(`  ${(0, i18n_1.T)('spak.cpc.ssetps.memory_cleaned', { freed: freed.toFixed(1) })}`));
                }
            }
            // Tripping the 80% threshold for a sandboxed plugin auto-trips its
            // circuit breaker. This finally wires `circuitBreakers` into the
            // rest of the CPC system (isolation, status and restore commands
            // already reference the same Map).
            for (const name of sandboxProcesses.keys()) {
                if (!circuitBreakers.get(name))
                    triggerCircuitBreaker(name);
            }
        }
    }, 10000);
}
function stopSSetPS() {
    if (ssetpsInterval) {
        clearInterval(ssetpsInterval);
        ssetpsInterval = null;
    }
}
function triggerCircuitBreaker(pluginName) {
    circuitBreakers.set(pluginName, true);
    console.log(kleur_1.default.red(`  ${(0, i18n_1.T)('spak.cpc.ssetps.circuit_break', { name: pluginName })}`));
    console.log(kleur_1.default.red(`  ${(0, i18n_1.T)('spak.cpc.ssetps.circuit_open', { name: pluginName })}`));
}
function restoreCircuitBreaker(pluginName) {
    circuitBreakers.delete(pluginName);
    console.log(kleur_1.default.green(`  ${(0, i18n_1.T)('spak.cpc.ssetps.circuit_restored', { name: pluginName })}`));
}
/**
 * Apply a firewall rule to control network access.
 * Rules are in the format: 'action: target' where action is 'allow' or 'deny'
 * and target can be 'localhost', 'external', or a specific IP/port.
 *
 * Note: This is a stub implementation. For production use, integrate with
 * Node.js net module or a firewall library.
 */
function applyFirewallRule(rule) {
    // Parse rule format: "action: target" (e.g., "allow localhost", "deny external")
    const match = rule.match(/^(allow|deny):\s*(.+)$/i);
    if (!match) {
        console.log(kleur_1.default.yellow(`  ⚠ ${(0, i18n_1.T)('spak.cpc.ssetps.firewall_rule_invalid', { rule })}`));
        return;
    }
    const [, action, target] = match;
    console.log(kleur_1.default.cyan(`  ${(0, i18n_1.T)('spak.cpc.ssetps.firewall_rule', { rule })}`));
    // TODO: Implement actual firewall logic using Node.js net module
    // For now, just log the rule as a placeholder
    // Example implementation would intercept net.connect() calls
}
// ====== Test Suite ======
function runTestServe(url) {
    console.log(kleur_1.default.cyan(`\n  ${(0, i18n_1.T)('spak.cpc.test.serve')}`));
    console.log(kleur_1.default.green(`  ${(0, i18n_1.T)('spak.cpc.test.serve_running', { url })}`));
    process.env.DEBUG = '*';
    process.env.SPAK_LOG_LEVEL = '3';
    console.log(`  ${kleur_1.default.cyan('[DEBUG]')} ${(0, i18n_1.T)('spak.cpc.test.debug_enabled')}`);
    console.log(`  ${kleur_1.default.cyan('[DEBUG]')} ${(0, i18n_1.T)('spak.cpc.test.debug_level')}`);
    console.log(`  ${kleur_1.default.cyan('[DEBUG]')} ${(0, i18n_1.T)('spak.cpc.test.debug_env')}`);
}
// ====== Export ======
function isAvailable() {
    try {
        const config = (0, config_1.loadConfig)();
        return config.cpc?.enabled === true;
    }
    catch {
        return false;
    }
}
function ensureAvailable() {
    if (!isAvailable()) {
        console.log(kleur_1.default.red(`\n  ${(0, i18n_1.T)('spak.cpc.config.not_available')}\n`));
        process.exit(1);
    }
}
// Main CPC initialization
function initCPC(config) {
    if (!config?.enabled)
        return;
    console.log(kleur_1.default.cyan(`\n  ${(0, i18n_1.T)('spak.cpc.title')}\n`));
    if (process.env.SPAK_NO_SANDBOX === '1') {
        console.log(kleur_1.default.yellow(`  ⚠ ${(0, i18n_1.T)('spak.cpc.sandbox.disabled_warning')}`));
    }
    else if (config.sandbox?.enabled) {
        console.log(`  ${kleur_1.default.green('✓')} ${(0, i18n_1.T)('spak.cpc.sandbox.enabled')}`);
    }
    if (config.processIsolation?.enabled) {
        console.log(`  ${kleur_1.default.green('✓')} ${(0, i18n_1.T)('spak.cpc.process_isolation.enabled')}`);
    }
    if (config.ssetps?.enabled !== false) {
        // Wire the user's configured memory limit through (env overrides still
        // win inside startSSetPS via resolveMemoryLimitMB).
        startSSetPS(config.ssetps?.memoryLimitMB);
        applyFirewallRule('default: allow localhost, deny external');
    }
    runPluginCheck();
}
function testAction(args, options) {
    // Extract subcommand from argv (e.g. "test serve" → "serve")
    const testIdx = process.argv.indexOf('test');
    const sub = testIdx >= 0 ? process.argv.slice(testIdx + 1).filter(a => !a.startsWith('-'))[0] || '' : '';
    if (sub === 'serve') {
        const host = options.host || '0.0.0.0';
        const port = options.port || '4321';
        runTestServe(`http://${host}:${port}`);
        return;
    }
    console.log(kleur_1.default.cyan(`\n  ${(0, i18n_1.T)('spak.cpc.test.starting')}\n`));
    runPluginCheck();
    console.log(`  ${kleur_1.default.green('✓')} ${(0, i18n_1.T)('spak.cpc.test.complete', { pass: '0', total: '0' })}\n`);
}
function cpcAction(args, options) {
    ensureAvailable();
    const sub = args.command || '';
    const arg1 = args.name || '';
    const action = args.action || '';
    if (!sub || sub === 'help') {
        console.log((0, i18n_1.T)('spak.cpc.help'));
        return;
    }
    switch (sub) {
        case 'check':
            runPluginCheck();
            break;
        case 'sandbox':
            if (arg1 === 'stop') {
                if (!action) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.sandbox.usage_stop')));
                    return;
                }
                terminateSandbox(action);
            }
            else {
                if (!arg1) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.sandbox.usage_start')));
                    return;
                }
                isolatePlugin(arg1);
            }
            break;
        case 'ssetps': {
            // CLI one-shot snapshot mode: print the current memory state and exit.
            // Long-running monitoring is owned by `serve` (via initCPC → startSSetPS),
            // so a standalone `cpc ssetps` must NOT leave a setInterval keeping the
            // process alive — otherwise the CLI hangs forever after printing.
            const ssetpsCfg = (() => { try {
                return (0, config_1.loadConfig)();
            }
            catch {
                return undefined;
            } })();
            const limit = resolveMemoryLimitMB(ssetpsCfg?.cpc?.ssetps?.memoryLimitMB);
            const usedNum = process.memoryUsage().rss / 1024 / 1024;
            const used = usedNum.toFixed(1);
            const usagePercent = (usedNum / limit) * 100;
            console.log(kleur_1.default.cyan(`  ${(0, i18n_1.T)('spak.cpc.ssetps.monitoring')} ${kleur_1.default.dim(`(limit=${limit}MB)`)}`));
            console.log(`  ${(0, i18n_1.T)('spak.cpc.status.memory_detail', { used, limit: String(limit) })}`);
            if (usagePercent > 80) {
                console.log(kleur_1.default.yellow(`  ${(0, i18n_1.T)('spak.cpc.ssetps.memory_warning', { usage: usagePercent.toFixed(1) })}`));
            }
            else {
                console.log(kleur_1.default.green(`  ${(0, i18n_1.T)('spak.cpc.ssetps.healthy', { usage: usagePercent.toFixed(1) })}`));
            }
            break;
        }
        case 'circuit':
            if (arg1 === 'restore') {
                if (!action) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.circuit.usage_restore')));
                    return;
                }
                restoreCircuitBreaker(action);
            }
            else {
                if (!arg1) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.circuit.usage_trigger')));
                    return;
                }
                triggerCircuitBreaker(arg1);
            }
            break;
        case 'status': {
            // Reflect the effective memory limit (env > config > default) even when
            // SSetPS hasn't been started, so `cpc status` never shows a stale 512MB.
            const statusCfg = (() => { try {
                return (0, config_1.loadConfig)();
            }
            catch {
                return undefined;
            } })();
            const effectiveLimit = resolveMemoryLimitMB(statusCfg?.cpc?.ssetps?.memoryLimitMB);
            console.log(kleur_1.default.cyan(`\n  ${(0, i18n_1.T)('spak.cpc.title')}`));
            console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cpc.status.sandbox'))} ${sandboxProcesses.size}`);
            console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cpc.status.circuit_breakers'))} ${circuitBreakers.size}`);
            console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cpc.status.ssetps'))} ${ssetpsInterval ? (0, i18n_1.T)('spak.cpc.status.active') : (0, i18n_1.T)('spak.cpc.status.inactive')}`);
            console.log(`  ${kleur_1.default.bold((0, i18n_1.T)('spak.cpc.status.memory'))} ${(0, i18n_1.T)('spak.cpc.status.memory_detail', { used: (process.memoryUsage().rss / 1024 / 1024).toFixed(1), limit: String(effectiveLimit) })}\n`);
            break;
        }
        default:
            console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.status.unknown', { sub })));
    }
}
const cpcDeclarations = [
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
            ensureAvailable();
            if (!args.name) {
                console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.sandbox.usage_start')));
                return;
            }
            // Handle "sandbox stop <name>" form
            if (args.name === 'stop') {
                const stopName = process.argv[process.argv.indexOf('stop') + 1] || '';
                if (!stopName) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.sandbox.usage_stop')));
                    return;
                }
                terminateSandbox(stopName);
                return;
            }
            isolatePlugin(args.name);
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
            ensureAvailable();
            if (!args.name) {
                console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.circuit.usage_trigger')));
                return;
            }
            // Handle "circuit restore <name>" form
            if (args.name === 'restore') {
                const restoreName = process.argv[process.argv.indexOf('restore') + 1] || '';
                if (!restoreName) {
                    console.log(kleur_1.default.red((0, i18n_1.T)('spak.cpc.circuit.usage_restore')));
                    return;
                }
                restoreCircuitBreaker(restoreName);
                return;
            }
            triggerCircuitBreaker(args.name);
        },
    },
    {
        command: 'cpc status',
        description: 'Show CPC status',
        action: () => { ensureAvailable(); cpcAction({ command: 'status', name: '', action: '' }, {}); },
    },
];
exports.default = cpcDeclarations;
//# sourceMappingURL=cpc.js.map