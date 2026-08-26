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
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = exports.Service = exports.Context = exports.resolveConfig = exports.Fragment = exports.h = exports.Schema = exports.Logger = void 0;
exports.defineConfig = defineConfig;
const cosmokit_1 = require("cosmokit");
const cordis_1 = require("cordis");
const cordis = __importStar(require("cordis"));
const filter_1 = require("./filter");
const command_1 = require("./command");
const i18n_1 = require("./i18n");
const middleware_1 = require("./middleware");
const permission_1 = require("./permission");
const schema_1 = require("./schema");
var cordis_2 = require("cordis");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return cordis_2.Logger; } });
Object.defineProperty(exports, "Schema", { enumerable: true, get: function () { return cordis_2.Schema; } });
var message_1 = require("@spakjs/message");
Object.defineProperty(exports, "h", { enumerable: true, get: function () { return message_1.h; } });
Object.defineProperty(exports, "Fragment", { enumerable: true, get: function () { return message_1.Fragment; } });
var cordis_3 = require("cordis");
Object.defineProperty(exports, "resolveConfig", { enumerable: true, get: function () { return cordis_3.resolveConfig; } });
class Context extends cordis.Context {
    static shadow = Symbol.for('session.shadow');
    constructor(config = {}) {
        super(config);
        this.mixin('$processor', ['match', 'middleware']);
        this.mixin('$filter', [
            'any', 'never', 'union', 'intersect', 'exclude',
        ]);
        this.mixin('$commander', ['command']);
        this.provide('$filter', new filter_1.FilterService(this), true);
        this.provide('schema', new schema_1.SchemaService(this), true);
        this.provide('$processor', new middleware_1.Processor(this), true);
        this.provide('i18n', new i18n_1.I18n(this, this.config.i18n), true);
        this.provide('permissions', new permission_1.Permissions(this), true);
        this.provide('$commander', new command_1.Commander(this, this.config), true);
        this.plugin(Spak, this.config);
    }
    /** @deprecated use `ctx.root` instead */
    get app() {
        return this.root;
    }
    async waterfall(...args) {
        const thisArg = typeof args[0] === 'object' || typeof args[0] === 'function' ? args.shift() : null;
        const name = args.shift();
        for (const hook of this.lifecycle.filterHooks(this.lifecycle._hooks[name] || [], thisArg)) {
            const result = await hook.callback.apply(thisArg, args);
            args[0] = result;
        }
        return args[0];
    }
    chain(...args) {
        const thisArg = typeof args[0] === 'object' || typeof args[0] === 'function' ? args.shift() : null;
        const name = args.shift();
        for (const hook of this.lifecycle.filterHooks(this.lifecycle._hooks[name] || [], thisArg)) {
            const result = hook.callback.apply(thisArg, args);
            args[0] = result;
        }
        return args[0];
    }
    /* eslint-enable max-len */
    before(name, listener, append = false) {
        const seg = name.split('/');
        seg[seg.length - 1] = 'before-' + seg[seg.length - 1];
        return this.on(seg.join('/'), listener, !append);
    }
}
exports.Context = Context;
exports.App = Context;
class Spak extends cordis.Service {
    config;
    constructor(ctx, config) {
        super(ctx, 'spak', true);
        this.config = config;
    }
}
exports.default = Spak;
(function (Context) {
    Context.Config = cordis_1.Schema.intersect([
        cordis_1.Schema.object({}),
    ]);
})(Context || (exports.App = exports.Context = Context = {}));
(0, cosmokit_1.defineProperty)(Context.Config, 'Basic', cordis_1.Schema.object({
    defaultAuthority: cordis_1.Schema.natural().min(0).max(9999).default(1)
        .description('Default user authority level used by the permission matcher.'),
    middlewareMaxDepth: cordis_1.Schema.natural().min(8).max(1024).default(64)
        .description('Maximum middleware/command call depth. Exceeding throws to stop runaway recursion.'),
    locale: cordis_1.Schema.string()
        .description("Default i18n locale override (e.g. 'zh', 'en'). Falls back to @spakjs/config if unset."),
}).description('Basic settings'));
(0, cosmokit_1.defineProperty)(Context.Config, 'I18n', i18n_1.I18n.Config);
(0, cosmokit_1.defineProperty)(Context.Config, 'Log', cordis_1.Schema.object({
    level: cordis_1.Schema.natural().min(0).max(5).default(3)
        .description('Log level: 0=silent, 1=error, 2=warn, 3=info, 4=debug, 5=trace.'),
    file: cordis_1.Schema.string()
        .description('Log file path for daemon mode.'),
    showTime: cordis_1.Schema.boolean().default(true)
        .description('Show timestamps in log output.'),
}).description('Log settings (all modules default to having log access)'));
(0, cosmokit_1.defineProperty)(Context.Config, 'Advanced', cordis_1.Schema.object({
    maxListeners: cordis_1.Schema.natural().default(64).description('Maximum number of listeners per type. Exceeding this is considered a memory leak.'),
}).description('Advanced settings'));
if (Context.Config.list) {
    Context.Config.list.push(Context.Config.Basic);
    Context.Config.list.push(cordis_1.Schema.object({
        i18n: i18n_1.I18n.Config,
    }));
    Context.Config.list.push(cordis_1.Schema.object({
        log: Context.Config.Log,
    }));
    Context.Config.list.push(Context.Config.Advanced);
}
class Service extends cordis.Service {
    [cordis.Service.setup]() {
        this.ctx = new Context();
    }
}
exports.Service = Service;
function defineConfig(config) {
    return config;
}
//# sourceMappingURL=context.js.map