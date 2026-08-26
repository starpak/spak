"use strict";
// ===== Spak — facade entry point =====
//
// This package ("spak") is the published entry. It is a PURE re-export shell:
// it carries no CLI or bootstrap glue (those now live in @spakjs/cli) and no
// kernel logic (that lives in @spakjs/core). It only re-exports the public
// surface so users can write `import { Context, h, t, createApp, Loader } from 'spak'`.
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.createApp = exports.Loader = exports.Config = exports.SpakLogger = exports.logShutdown = exports.logStartup = exports.colorFormatter = exports.defaultFormatter = exports.attachCordis = exports.getLoggerConfig = exports.configureLogger = exports.createLogger = exports.StreamTransport = exports.FileTransport = exports.ConsoleTransport = exports.Transport = exports.LEVEL_NAMES = exports.LogLevel = exports.getCurrentLanguage = exports.setLanguage = exports.T = exports.t = exports.init = exports.loadYmlTranslation = void 0;
__exportStar(require("@spakjs/core"), exports);
__exportStar(require("@spakjs/message"), exports);
__exportStar(require("@spakjs/util"), exports);
// Explicitly re-export from i18n to avoid conflicts with core's re-exports
// (core inlines LocaleTree/fallback; i18n also exports them → ambiguous).
var i18n_1 = require("@spakjs/i18n");
Object.defineProperty(exports, "loadYmlTranslation", { enumerable: true, get: function () { return i18n_1.loadYmlTranslation; } });
Object.defineProperty(exports, "init", { enumerable: true, get: function () { return i18n_1.init; } });
Object.defineProperty(exports, "t", { enumerable: true, get: function () { return i18n_1.t; } });
Object.defineProperty(exports, "T", { enumerable: true, get: function () { return i18n_1.T; } });
Object.defineProperty(exports, "setLanguage", { enumerable: true, get: function () { return i18n_1.setLanguage; } });
Object.defineProperty(exports, "getCurrentLanguage", { enumerable: true, get: function () { return i18n_1.getCurrentLanguage; } });
// Re-export @spakjs/log explicitly (not `export *`) because both core (cordis)
// and @spakjs/log expose a class named `Logger`. Keeping core's cordis Logger as
// the default `Logger` preserves backward compatibility; @spakjs/log's logger
// class is exposed as `SpakLogger`. Prefer the `createLogger()` factory.
var log_1 = require("@spakjs/log");
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return log_1.LogLevel; } });
Object.defineProperty(exports, "LEVEL_NAMES", { enumerable: true, get: function () { return log_1.LEVEL_NAMES; } });
Object.defineProperty(exports, "Transport", { enumerable: true, get: function () { return log_1.Transport; } });
Object.defineProperty(exports, "ConsoleTransport", { enumerable: true, get: function () { return log_1.ConsoleTransport; } });
Object.defineProperty(exports, "FileTransport", { enumerable: true, get: function () { return log_1.FileTransport; } });
Object.defineProperty(exports, "StreamTransport", { enumerable: true, get: function () { return log_1.StreamTransport; } });
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return log_1.createLogger; } });
Object.defineProperty(exports, "configureLogger", { enumerable: true, get: function () { return log_1.configureLogger; } });
Object.defineProperty(exports, "getLoggerConfig", { enumerable: true, get: function () { return log_1.getLoggerConfig; } });
Object.defineProperty(exports, "attachCordis", { enumerable: true, get: function () { return log_1.attachCordis; } });
Object.defineProperty(exports, "defaultFormatter", { enumerable: true, get: function () { return log_1.defaultFormatter; } });
Object.defineProperty(exports, "colorFormatter", { enumerable: true, get: function () { return log_1.colorFormatter; } });
Object.defineProperty(exports, "logStartup", { enumerable: true, get: function () { return log_1.logStartup; } });
Object.defineProperty(exports, "logShutdown", { enumerable: true, get: function () { return log_1.logShutdown; } });
Object.defineProperty(exports, "SpakLogger", { enumerable: true, get: function () { return log_1.Logger; } });
exports.Config = __importStar(require("@spakjs/config"));
var loader_1 = require("@spakjs/loader");
Object.defineProperty(exports, "Loader", { enumerable: true, get: function () { return __importDefault(loader_1).default; } });
__exportStar(require("@spakjs/loader"), exports);
// createApp is hosted by @spakjs/cli; re-export for backward compatibility so
// `import { createApp } from 'spak'` keeps working.
var cli_1 = require("@spakjs/cli");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return cli_1.createApp; } });
//# sourceMappingURL=index.js.map