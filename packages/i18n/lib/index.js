"use strict";
// ===== @spakjs/i18n — unified I18n utilities for Spak =====
//
// Merges two previous packages:
//   @spakjs/i18n-utils  → LocaleTree, fallback
//   @spakjs/locales     → init, t, T, setLanguage, getCurrentLanguage,
//                          loadYmlTranslation (internal) + default object
//
// Why merge? Because the two were tightly coupled (i18n-utils depended on
// locales via package.json despite not importing it in source) and their
// conceptual surface is very small.  One package is easier for users.
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleTree = void 0;
exports.fallback = fallback;
exports.loadEmbeddedTranslations = loadEmbeddedTranslations;
exports.loadYmlTranslation = loadYmlTranslation;
exports.init = init;
exports.t = t;
exports.T = T;
exports.setLanguage = setLanguage;
exports.getCurrentLanguage = getCurrentLanguage;
// ———————————————————————————————————————————————————————————————————————
// From: @spakjs/i18n-utils (LocaleTree + fallback algorithm)
// ———————————————————————————————————————————————————————————————————————
const cosmokit_1 = require("cosmokit");
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
const config_1 = require("@spakjs/config");
const fs_1 = require("fs");
const path_1 = require("path");
const js_yaml_1 = require("js-yaml");
let _i18n = null;
// Fallback cache: manually loaded from yml files when i18n is not available
const fallbackCache = {};
/**
 * Register pre-baked (embedded) translations at startup — used by the
 * self-contained (SEA) binary build where no locale files exist on disk.
 * Flat dot-notation keys, same shape as flattenKeys() output.
 */
function loadEmbeddedTranslations(lang, flat) {
    if (!flat || typeof flat !== 'object')
        return;
    const existing = fallbackCache[lang] || {};
    Object.assign(existing, flat);
    fallbackCache[lang] = existing;
}
/**
 * Flatten a nested object (produced by loading .yml) into dot-notation flat
 * keys, e.g. `{ spak: { cli: { serve: { started: "..." } } } }` becomes
 * `{ "spak.cli.serve.started": "..." }`. This matches the dotted keys used by
 * T()/t().
 */
function flattenKeys(obj, prefix = '', out = {}) {
    if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
            const key = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                flattenKeys(v, key, out);
            }
            else if (typeof v === 'string') {
                out[key] = v;
            }
        }
    }
    return out;
}
function loadYmlTranslation(lang, rootDir = process.cwd()) {
    if (fallbackCache[lang])
        return fallbackCache[lang];
    const allMessages = {};
    // Build a list of candidate root directories to search for locale files.
    // Unified structure: translations live in the project-level /locales dir.
    // We still scan legacy locations (src/locales, per-package locales) for
    // backward compatibility, but the authoritative source is /locales/*.yml.
    const i18nDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    const candidateRoots = new Set([
        rootDir,
        (0, path_1.resolve)(i18nDir, '..', '..', '..'), // monorepo root: packages/i18n/lib → root
        (0, path_1.resolve)(i18nDir, '..', '..'), // packages/i18n → packages/ → root (one less level)
        (0, path_1.resolve)(i18nDir, '..'), // packages/i18n/lib → packages/i18n
    ]);
    // Also check SPAK_ROOT env var for explicit override
    if (process.env.SPAK_ROOT)
        candidateRoots.add(process.env.SPAK_ROOT);
    // Loader that reads a single locales directory and merges the flattened
    // messages (lang-specific file picked first, lang-prefixed as fallback).
    const loadDir = (localesDir) => {
        if (!(0, fs_1.existsSync)(localesDir))
            return;
        let existing = [];
        try {
            existing = (0, fs_1.readdirSync)(localesDir).filter(f => f.endsWith('.yml'));
        }
        catch {
            return;
        }
        const exact = `${lang}.yml`;
        const prefixMatch = existing.filter(f => f.startsWith(`${lang}-`) && f !== exact).sort();
        const ordered = [exact, ...prefixMatch];
        for (const fileName of ordered) {
            const ymlFile = (0, path_1.resolve)(localesDir, fileName);
            if (!(0, fs_1.existsSync)(ymlFile))
                continue;
            try {
                const content = (0, fs_1.readFileSync)(ymlFile, 'utf-8');
                const parsed = (0, js_yaml_1.load)(content);
                if (parsed)
                    Object.assign(allMessages, flattenKeys(parsed));
                break;
            }
            catch (err) {
                if (process.env.SPAK_DEBUG)
                    console.debug('[i18n] skip yml:', ymlFile, err?.message ?? String(err));
            }
        }
    };
    // Search each candidate root for locale files.
    // Priority (highest first): /locales (project-level unified) → src/locales → lib/locales → per-package locales.
    for (const cRoot of candidateRoots) {
        // 1) Project-level unified locales directory (PRIMARY / AUTHORITATIVE).
        loadDir((0, path_1.resolve)(cRoot, 'locales'));
        loadDir((0, path_1.resolve)(cRoot, 'lib', 'locales')); // published package copies /locales into lib/locales as well
        // 2) Legacy: project root src/locales and lib/locales (for back-compat).
        loadDir((0, path_1.resolve)(cRoot, 'src/locales'));
        loadDir((0, path_1.resolve)(cRoot, 'lib/locales'));
        // 3) Legacy: per-package / per-plugin locales dirs.
        for (const subDir of ['packages', 'plugins']) {
            const dir = (0, path_1.resolve)(cRoot, subDir);
            if (!(0, fs_1.existsSync)(dir))
                continue;
            let entries = [];
            try {
                entries = (0, fs_1.readdirSync)(dir).filter(d => (0, fs_1.statSync)((0, path_1.resolve)(dir, d)).isDirectory());
            }
            catch {
                continue;
            }
            for (const entry of entries) {
                loadDir((0, path_1.resolve)(dir, entry, 'locales'));
                loadDir((0, path_1.resolve)(dir, entry, 'src', 'locales'));
            }
        }
    }
    fallbackCache[lang] = allMessages;
    return allMessages;
}
/** Register the i18n instance from core. */
function init(i18n) {
    _i18n = i18n;
}
function resolveParams(message, params) {
    if (!params)
        return message;
    for (const [k, v] of Object.entries(params)) {
        const escapedK = String(k).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        message = message.replace(new RegExp(`\\{${escapedK}\\}`, 'g'), String(v).replace(/\$/g, '$$$$'));
    }
    return message;
}
/**
 * Translate a key using the core i18n system.
 * Falls back to direct yml file loading when core is not available.
 * Falls back to `<key> (missing)` if the key is not found, so callers can
 * tell a missing translation apart from a successful lookup.
 */
function t(key, params) {
    const lang = (0, config_1.getConfig)('language') || 'en';
    // Try core i18n first, but fall through to yml if the key isn't found
    if (_i18n) {
        const result = _i18n.render([lang], [key], params || {});
        const text = result.map((e) => (e && e.type === 'text') ? (e.attrs?.content ?? e.children?.[0] ?? '') : String(e)).join('');
        if (text && text !== key)
            return text;
        // Fall through to yml fallback instead of returning the raw key
    }
    const messages = loadYmlTranslation(lang);
    let message = messages[key];
    if (!message && lang !== 'en') {
        const enMessages = loadYmlTranslation('en');
        message = enMessages[key];
    }
    if (!message)
        return `${key} (missing)`;
    return resolveParams(message, params);
}
/** Alias for `t()`. */
function T(key, params) {
    return t(key, params);
}
function setLanguage(lang) {
    (0, config_1.setConfig)('language', lang);
    return true;
}
function getCurrentLanguage() {
    return (0, config_1.getConfig)('language') || 'en';
}
exports.default = { init, t, T, setLanguage, getCurrentLanguage, loadYmlTranslation, loadEmbeddedTranslations };
//# sourceMappingURL=index.js.map