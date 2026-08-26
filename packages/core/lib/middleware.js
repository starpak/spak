"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedCache = exports.Processor = exports.Next = exports.SessionError = void 0;
const util_1 = require("@spakjs/util");
const cosmokit_1 = require("cosmokit");
const context_1 = require("./context");
class SessionError extends Error {
    path;
    param;
    constructor(path, param) {
        super((0, util_1.makeArray)(path)[0]);
        this.path = path;
        this.param = param;
    }
}
exports.SessionError = SessionError;
var Next;
(function (Next) {
    Next.MAX_DEPTH = 64;
    async function compose(callback, next) {
        return typeof callback === 'function' ? callback(next) : callback;
    }
    Next.compose = compose;
})(Next || (exports.Next = Next = {}));
class Processor {
    ctx;
    _hooks = [];
    _sessions = Object.create(null);
    constructor(ctx) {
        this.ctx = ctx;
        (0, cosmokit_1.defineProperty)(this, context_1.Context.current, ctx);
    }
    middleware(middleware, options) {
        if (typeof options !== 'object') {
            options = { prepend: options };
        }
        return this.ctx.lifecycle.register('middleware', this._hooks, middleware, options);
    }
}
exports.Processor = Processor;
class SharedCache {
    #keyMap = new Map();
    get(ref, key) {
        const entry = this.#keyMap.get(key);
        if (!entry)
            return;
        entry.refs.add(ref);
        return entry.value;
    }
    set(ref, key, value) {
        let entry = this.#keyMap.get(key);
        if (entry) {
            entry.value = value;
        }
        else {
            entry = { value, key, refs: new Set() };
            this.#keyMap.set(key, entry);
        }
        entry.refs.add(ref);
    }
    delete(ref) {
        for (const key of [...this.#keyMap.keys()]) {
            const entry = this.#keyMap.get(key);
            if (!entry)
                continue;
            const { refs } = entry;
            refs.delete(ref);
            if (!refs.size) {
                this.#keyMap.delete(key);
            }
        }
    }
}
exports.SharedCache = SharedCache;
//# sourceMappingURL=middleware.js.map