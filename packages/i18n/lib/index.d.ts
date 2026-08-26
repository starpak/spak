export type LocaleTree = {
    [key in string]: LocaleTree;
};
export declare namespace LocaleTree {
    function from(locales: string[]): LocaleTree;
}
export declare function fallback(tree: LocaleTree, locales: string[]): string[];
import type { I18n } from '@spakjs/core';
export declare function loadYmlTranslation(lang: string, rootDir?: string): Record<string, string>;
/** Register the i18n instance from core. */
export declare function init(i18n: I18n): void;
/**
 * Translate a key using the core i18n system.
 * Falls back to direct yml file loading when core is not available.
 * Falls back to `<key> (missing)` if the key is not found, so callers can
 * tell a missing translation apart from a successful lookup.
 */
export declare function t(key: string, params?: Record<string, string | number>): string;
/** Alias for `t()`. */
export declare function T(key: string, params?: Record<string, string | number>): string;
export declare function setLanguage(lang: string): boolean;
export declare function getCurrentLanguage(): string;
declare const _default: {
    init: typeof init;
    t: typeof t;
    T: typeof T;
    setLanguage: typeof setLanguage;
    getCurrentLanguage: typeof getCurrentLanguage;
    loadYmlTranslation: typeof loadYmlTranslation;
};
export default _default;
//# sourceMappingURL=index.d.ts.map