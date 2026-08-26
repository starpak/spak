"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18n = exports.LocaleTree = void 0;
exports.fallback = fallback;
exports.createMatch = createMatch;
const fastest_levenshtein_1 = require("fastest-levenshtein");
const cosmokit_1 = require("cosmokit");
const cordis_1 = require("cordis");
const message_1 = require("@spakjs/message");
var LocaleTree;
(function (LocaleTree) {
    function from(locales) {
        const tree = {};
        for (const locale of locales.filter(Boolean)) {
            const tokens = locale.split('-');
            let current = tree;
            for (let i = 0; i < tokens.length; i++) {
                const locale = tokens.slice(0, i + 1).join('-');
                current = current[locale] = current[locale] || {};
            }
        }
        return tree;
    }
    LocaleTree.from = from;
})(LocaleTree || (exports.LocaleTree = LocaleTree = {}));
function toLocaleEntry(key, tree) {
    return [key, [[key, []], ...Object.entries(tree).map(([key, value]) => toLocaleEntry(key, value))]];
}
function* traverse([key, children], ignored) {
    if (!children.length) {
        return yield key;
    }
    for (const child of children) {
        if (ignored.includes(child))
            continue;
        yield* traverse(child, ignored);
    }
}
function fallback(tree, locales) {
    const root = toLocaleEntry('', tree);
    const ignored = [];
    for (const locale of (0, cosmokit_1.deduplicate)(locales).filter(Boolean).reverse()) {
        let prefix = '', children = root[1];
        const tokens = locale ? locale.split('-') : [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const current = prefix + token;
            const index = children.findIndex(([key]) => key === current);
            if (index < 0)
                break;
            const entry = children[index];
            if (index > 0) {
                children.splice(index, 1);
                children.unshift(entry);
            }
            children = entry[1];
            prefix = current + '-';
            if (current === locale) {
                ignored.unshift(entry);
            }
        }
    }
    ignored.push(root);
    const results = [];
    for (const entry of ignored) {
        results.push(...traverse(entry, ignored));
    }
    return results;
}
// ————— Lazy embedded locales loader (Node-only; skipped in browser bundles) —————
// Core no longer executes filesystem reads at module-load time.  Instead the
// constructor probes for Node APIs on first use and populates the store.
// This keeps the core package Node-IO-free in the import graph (as required by
// MODULE_DIVISION.md §3) while preserving existing behaviour for Node runtimes.
let _embeddedLocales = undefined;
function getEmbeddedLocales() {
    if (_embeddedLocales !== undefined)
        return _embeddedLocales || {};
    _embeddedLocales = null;
    if (typeof require === 'undefined' || typeof process === 'undefined')
        return {};
    try {
        const fs = require('fs');
        const path = require('path');
        const yaml = require('js-yaml');
        const dir = path.resolve(__dirname, './locales');
        const out = {};
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (path.extname(file) !== '.yml')
                continue;
            const localeName = file.replace(/\.yml$/, '');
            const content = fs.readFileSync(path.resolve(dir, file), 'utf8');
            out[localeName] = yaml.load(content);
        }
        _embeddedLocales = out;
    }
    catch {
        /* embedded locales directory missing or unavailable — ignore */
    }
    return _embeddedLocales || {};
}
const logger = new cordis_1.Logger('i18n');
const kTemplate = Symbol('template');
// Cache pattern → matcher to avoid recompiling the same regex hundreds of
// times (permissions store, i18n find loop, etc).
const matchCache = new Map();
function createMatch(pattern) {
    const cached = matchCache.get(pattern);
    if (cached)
        return cached;
    const groups = [];
    // Use `[^.]+` per group instead of `.+` to drastically reduce backtracking
    // when matching long strings with multiple consecutive groups (ReDoS guard).
    // If the pattern explicitly contains dots inside groups we still need a
    // catch-all, so we fall back to a non-greedy `.+?` only when a group name
    // itself contains a dot (which is unusual).
    const source = pattern.replace(/\(([^)]+)\)/g, (_, name) => {
        groups.push(name);
        return name.includes('.') ? '(.+?)' : '([^.]+)';
    });
    const regexp = new RegExp(`^${source}$`);
    const matcher = (string) => {
        const capture = regexp.exec(string);
        if (!capture)
            return;
        const data = {};
        for (let i = 0; i < groups.length; i++) {
            data[groups[i]] = capture[i + 1];
        }
        return data;
    };
    matchCache.set(pattern, matcher);
    return matcher;
}
class I18n {
    ctx;
    _data = {};
    _presets = {};
    locales;
    constructor(ctx, config) {
        this.ctx = ctx;
        this.locales = LocaleTree.from(config.locales ?? []);
        this.define('', { '': '' });
        for (const [locale, data] of Object.entries(getEmbeddedLocales())) {
            this.define(locale, data);
        }
    }
    fallback(locales) {
        return fallback(this.locales, locales);
    }
    compare(expect, actual, options = {}) {
        if (!expect && !actual)
            return 1;
        if (!expect || !actual)
            return 0;
        const value = 1 - (0, fastest_levenshtein_1.distance)(expect, actual) / expect.length;
        return value;
    }
    get(key, locales = []) {
        const result = {};
        for (const locale of this.fallback(locales)) {
            const value = this._data[locale]?.[key];
            if (value)
                result[locale] = value;
        }
        return result;
    }
    *set(locale, prefix, value) {
        if (typeof value === 'object' && value && !prefix.includes('@')) {
            for (const key in value) {
                if (key.startsWith('_'))
                    continue;
                yield* this.set(locale, prefix + key + '.', value[key]);
            }
        }
        else if (prefix.includes('@')) {
            throw new Error('preset is deprecated');
        }
        else if (typeof value === 'string') {
            const dict = this._data[locale];
            const path = prefix.slice(0, -1);
            if (!(0, cosmokit_1.isNullable)(dict[path]) && !locale.startsWith('$') && dict[path] !== value) {
                logger.warn('override', locale, path);
            }
            dict[path] = value;
            yield path;
        }
        else {
            delete this._data[locale][prefix.slice(0, -1)];
        }
    }
    define(locale, ...args) {
        const dict = this._data[locale] ||= {};
        const paths = [...typeof args[0] === 'string'
                ? this.set(locale, args[0] + '.', args[1])
                : this.set(locale, '', args[0])];
        this.ctx.emit('internal/i18n');
        return this.ctx.collect('i18n', () => {
            for (const path of paths) {
                delete dict[path];
            }
            this.ctx.emit('internal/i18n');
        });
    }
    find(pattern, actual, options = {}) {
        if (!actual)
            return [];
        const match = createMatch(pattern);
        const results = [];
        for (const locale in this._data) {
            for (const path in this._data[locale]) {
                const data = match(path);
                if (!data)
                    continue;
                const expect = this._data[locale][path];
                if (typeof expect !== 'string')
                    continue;
                const similarity = this.compare(expect, actual, options);
                if (!similarity)
                    continue;
                results.push({ locale, data, similarity });
            }
        }
        return results;
    }
    _render(value, params, locale) {
        if (value === undefined)
            return;
        if (typeof value !== 'string') {
            const preset = value[kTemplate];
            const render = this._presets[preset];
            if (!render)
                throw new Error(`Preset "${preset}" not found`);
            return [message_1.h.text(render(value, params, locale))];
        }
        return message_1.h.parse(value, params);
    }
    /** @deprecated */
    text(locales, paths, params) {
        return this.render(locales, paths, params).join('');
    }
    render(locales, paths, params) {
        locales = this.fallback(locales);
        // try every locale
        for (const path of paths) {
            for (const locale of locales) {
                for (const key of ['$' + locale, locale]) {
                    const value = this._data[key]?.[path];
                    if (value === undefined || !value && !locale && path !== '')
                        continue;
                    return this._render(value, params, locale);
                }
            }
        }
        // path not found
        logger.warn('missing', paths[0]);
        return [message_1.h.text(paths[0])];
    }
}
exports.I18n = I18n;
(function (I18n) {
    I18n.Config = cordis_1.Schema.object({
        locales: cordis_1.Schema.array(String).role('table').default(['en-US']).description('Available locales in fallback order.'),
    }).description('Locale settings');
})(I18n || (exports.I18n = I18n = {}));
//# sourceMappingURL=i18n.js.map