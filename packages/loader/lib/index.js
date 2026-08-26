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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@spakjs/core");
const fs_1 = require("fs");
const dotenv = __importStar(require("dotenv"));
const ns_require_1 = __importDefault(require("ns-require"));
const shared_1 = __importStar(require("./shared"));
const module_1 = require("module");
__exportStar(require("./shared"), exports);
const _require = (0, module_1.createRequire)(__filename);
const logger = new core_1.Logger('app');
// Use file extension detection instead of deprecated require.extensions
for (const ext of ['.json', '.yaml', '.yml']) {
    shared_1.default.extensions.add(ext);
}
const initialKeys = Object.getOwnPropertyNames(process.env);
class NodeLoader extends shared_1.default {
    scope;
    localKeys = [];
    exitOnReload = true;
    async init(filename) {
        await super.init(filename);
        this.scope = (0, ns_require_1.default)({
            namespace: 'spakjs',
            prefix: 'plugin',
            official: 'spakjs',
            dirname: this.baseDir,
        });
    }
    async readConfig(initial = false) {
        // remove local env variables
        for (const key of this.localKeys) {
            delete process.env[key];
        }
        // load env files
        const parsed = {};
        for (const filename of this.envFiles) {
            try {
                const raw = await fs_1.promises.readFile(filename, 'utf8');
                Object.assign(parsed, dotenv.parse(raw));
            }
            catch (err) {
                if (process.env.SPAK_DEBUG)
                    console.debug('[loader] skip env file:', filename, err?.message ?? String(err));
            }
        }
        // write local env into process.env
        this.localKeys = [];
        for (const key in parsed) {
            if (initialKeys.includes(key))
                continue;
            process.env[key] = parsed[key];
            this.localKeys.push(key);
        }
        return await super.readConfig(initial);
    }
    async import(name) {
        try {
            if (!this.cache[name]) {
                try {
                    this.cache[name] = _require.resolve(name);
                }
                catch {
                    this.cache[name] = this.scope.resolve(name);
                }
            }
        }
        catch (err) {
            logger.error(err.message);
            return;
        }
        return _require(this.cache[name]);
    }
    fullReload(code = shared_1.default.exitCode) {
        const body = JSON.stringify(this.envData);
        let didExit = false;
        const doExit = () => {
            if (didExit)
                return;
            didExit = true;
            logger.info('trigger full reload');
            if (this.exitOnReload) {
                process.exit(code);
            }
            else {
                throw new shared_1.FullReloadError(code);
            }
        };
        // Safety net: if the IPC channel is already closed or hangs (parent
        // process died, Node.js won't fire the callback), we still want to
        // actually restart instead of zombifying.
        const t = setTimeout(doExit, 500);
        if (t.unref)
            t.unref();
        if (typeof process.send === 'function') {
            try {
                process.send({ type: 'shared', body }, (err) => {
                    clearTimeout(t);
                    if (err)
                        logger.error('failed to send shared data');
                    doExit();
                });
            }
            catch {
                clearTimeout(t);
                doExit();
            }
        }
        else {
            clearTimeout(t);
            doExit();
        }
    }
}
exports.default = NodeLoader;
//# sourceMappingURL=index.js.map