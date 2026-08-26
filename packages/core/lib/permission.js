"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permissions = void 0;
const cordis_1 = require("cordis");
const cosmokit_1 = require("cosmokit");
const context_1 = require("./context");
const i18n_1 = require("./i18n");
const logger = new cordis_1.Logger('app');
class Permissions {
    ctx;
    store = [];
    constructor(ctx) {
        this.ctx = ctx;
        (0, cosmokit_1.defineProperty)(this, context_1.Context.current, ctx);
        ctx.alias('permissions', ['perms']);
        this.define('authority:(value)', {
            check: ({ value }, { user }) => {
                return !user || user.authority >= +value;
            },
            list: () => Array(5).fill(0).map((_, i) => `authority:${i}`),
        });
    }
    define(pattern, options) {
        const entry = {
            ...options,
            match: (0, i18n_1.createMatch)(pattern),
        };
        if (!pattern.includes('('))
            entry.list ||= () => [pattern];
        return this.ctx.effect(() => {
            this.store.push(entry);
            return () => (0, cosmokit_1.remove)(this.store, entry);
        });
    }
    provide(pattern, check) {
        return this.define(pattern, { check });
    }
    inherit(pattern, inherits) {
        return this.define(pattern, { inherits });
    }
    depend(pattern, depends) {
        return this.define(pattern, { depends });
    }
    list(result = new Set()) {
        for (const { list } of this.store) {
            if (!list)
                continue;
            for (const name of list()) {
                result.add(name);
            }
        }
        return [...result];
    }
    async check(name, session) {
        const results = await Promise.all(this.store.map(async ({ match, check }) => {
            if (!check)
                return false;
            const data = match(name);
            if (!data)
                return false;
            try {
                return await check(data, session);
            }
            catch (error) {
                // Log full error details for debugging while denying access
                logger.warn('Permission check failed for', name, ':', error);
                // Security: on error, deny access rather than allowing it
                // This prevents attackers from triggering errors to bypass checks
                return false;
            }
        }));
        return results.some(Boolean);
    }
    subgraph(type, parents, result = new Set()) {
        let name;
        const queue = [...parents];
        while ((name = queue.shift())) {
            if (result.has(name))
                continue;
            result.add(name);
            for (const entry of this.store) {
                const data = entry.match(name);
                if (!data)
                    continue;
                let links = entry[type];
                if (typeof links === 'function')
                    links = links(data);
                if (Array.isArray(links))
                    queue.push(...links);
            }
        }
        return result;
    }
    async test(names, session = {}, cache = new Map()) {
        session = session[context_1.Context.shadow] || session;
        if (typeof names === 'string')
            names = [names];
        for (const name of this.subgraph('depends', names)) {
            const parents = [...this.subgraph('inherits', [name])];
            const results = await Promise.all(parents.map(parent => {
                let result = cache.get(parent);
                if (!result) {
                    result = this.check(parent, session);
                    cache.set(parent, result);
                }
                return result;
            }));
            if (results.some(result => result))
                continue;
            return false;
        }
        return true;
    }
}
exports.Permissions = Permissions;
//# sourceMappingURL=permission.js.map