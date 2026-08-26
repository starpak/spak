"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getConfig = getConfig;
exports.setConfig = setConfig;
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const CONFIG_DIR = (0, path_1.resolve)((0, os_1.homedir)(), '.spak');
const CONFIG_FILE = (0, path_1.resolve)(CONFIG_DIR, 'config.json');
const defaultConfig = {
    language: 'en',
    server: {
        host: '0.0.0.0',
        port: 4321,
    },
    plugins: {},
};
function ensureConfigDir() {
    if (!(0, fs_1.existsSync)(CONFIG_DIR)) {
        (0, fs_1.mkdirSync)(CONFIG_DIR, { recursive: true });
    }
}
function loadConfig() {
    ensureConfigDir();
    if (!(0, fs_1.existsSync)(CONFIG_FILE)) {
        saveConfig(defaultConfig);
        return { ...defaultConfig };
    }
    try {
        const data = (0, fs_1.readFileSync)(CONFIG_FILE, 'utf-8');
        return { ...defaultConfig, ...JSON.parse(data) };
    }
    catch {
        return { ...defaultConfig };
    }
}
function saveConfig(config) {
    ensureConfigDir();
    // Atomic write: write to a temp file first, then rename into place.
    // This prevents half-written JSON when the process crashes mid-write, and
    // reduces the race window between two concurrent setConfig() calls.
    const tmpFile = CONFIG_FILE + '.tmp.' + process.pid.toString(36);
    try {
        (0, fs_1.writeFileSync)(tmpFile, JSON.stringify(config, null, 2), 'utf-8');
        // rename() is atomic on POSIX filesystems; on Windows we fallback to
        // replace via copy+unlink if rename fails.
        try {
            require('fs').renameSync(tmpFile, CONFIG_FILE);
        }
        catch {
            require('fs').copyFileSync(tmpFile, CONFIG_FILE);
            require('fs').unlinkSync(tmpFile);
        }
    }
    catch (err) {
        try {
            require('fs').unlinkSync(tmpFile);
        }
        catch { /* ignore */ }
        throw err;
    }
}
function getConfig(key) {
    const config = loadConfig();
    const parts = key.split('.');
    let value = config;
    for (const part of parts) {
        if (value === undefined || value === null)
            return undefined;
        value = value[part];
    }
    return value;
}
function setConfig(key, value) {
    const config = loadConfig();
    const parts = key.split('.');
    let obj = config;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]])
            obj[parts[i]] = {};
        obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    saveConfig(config);
    return config;
}
exports.default = { loadConfig, saveConfig, getConfig, setConfig };
//# sourceMappingURL=index.js.map