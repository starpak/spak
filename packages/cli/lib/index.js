"use strict";
// ===== @spakjs/cli — command declarations + createApp bootstrap =====
//
// The spak CLI (serve / config / cpc) and the one-line application bootstrap
// (createApp) live here, OUTSIDE @spakjs/core. core stays a pure kernel (no
// i18n / output / config footprint); this package binds core to the Node
// runtime and drives the cac CLI.
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
exports.version = exports.cpcDeclarations = exports.configDeclarations = exports.serveDeclarations = void 0;
exports.createApp = createApp;
const i18n_1 = require("@spakjs/i18n");
const log_1 = require("@spakjs/log");
const cpc_1 = require("./commands/cpc");
const version_1 = require("./version");
Object.defineProperty(exports, "version", { enumerable: true, get: function () { return version_1.version; } });
var start_1 = require("./cli/start");
Object.defineProperty(exports, "serveDeclarations", { enumerable: true, get: function () { return __importDefault(start_1).default; } });
var config_1 = require("./commands/config");
Object.defineProperty(exports, "configDeclarations", { enumerable: true, get: function () { return __importDefault(config_1).default; } });
var cpc_2 = require("./commands/cpc");
Object.defineProperty(exports, "cpcDeclarations", { enumerable: true, get: function () { return __importDefault(cpc_2).default; } });
/**
 * One-line convenience for most applications: read config, create the
 * application, wire i18n, optionally apply host/port overrides, and return
 * the ready-to-start Context.
 *
 * ```ts
 * import { createApp } from '@spakjs/cli'
 * const app = await createApp({ language: 'zh', port: 5000 })
 * await app.start()
 * ```
 */
async function createApp(options = {}) {
    const { config, language, host, port, env } = options;
    if (env)
        Object.assign(process.env, env);
    if (host)
        process.env.SPAK_HOST = host;
    if (port)
        process.env.SPAK_PORT = String(port);
    // CPC module whitelist — enforced even for programmatic createApp() callers.
    (0, cpc_1.runModuleWhitelistCheck)(true);
    // Normalize ESM / CJS / named-export shapes so `new NodeLoader()` works.
    const mod = await Promise.resolve().then(() => __importStar(require('@spakjs/loader')));
    const NodeLoader = mod.default?.default ?? mod.default ?? mod.NodeLoader ?? mod;
    const loader = new NodeLoader();
    await loader.init(config);
    await loader.readConfig(true);
    if (language)
        (0, i18n_1.setLanguage)(language);
    const app = await loader.createApp();
    if (app.i18n)
        (0, i18n_1.init)(app.i18n);
    (0, log_1.logStartup)({ version: version_1.version, pid: process.pid, configPath: config, host, port });
    return app;
}
//# sourceMappingURL=index.js.map