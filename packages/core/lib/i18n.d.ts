import { Dict } from 'cosmokit';
import { Schema } from 'cordis';
import { Context } from './context';
export type LocaleTree = {
    [key in string]: LocaleTree;
};
export declare namespace LocaleTree {
    function from(locales: string[]): LocaleTree;
}
export declare function fallback(tree: LocaleTree, locales: string[]): string[];
declare const kTemplate: unique symbol;
declare module './context' {
    interface Context {
        i18n: I18n;
    }
    interface Events {
        'internal/i18n'(): void;
    }
}
type GroupNames<P extends string, K extends string = never> = P extends `${string}(${infer R})${infer S}` ? GroupNames<S, K | R> : K;
export type MatchResult<P extends string = never> = Record<GroupNames<P>, string>;
export declare function createMatch<P extends string>(pattern: P): (string: string) => undefined | MatchResult<P>;
export interface CompareOptions {
    minSimilarity?: number;
}
export declare namespace I18n {
    type Node = string | Store;
    interface Store {
        [kTemplate]?: string;
        [K: string]: Node;
    }
    type Formatter = (value: any, args: string[], locale: string) => string;
    type Renderer = (dict: Dict, params: any, locale: string) => string;
    interface FindOptions extends CompareOptions {
    }
    interface FindResult<P extends string> {
        locale: string;
        data: MatchResult<P>;
        similarity: number;
    }
}
export declare class I18n {
    ctx: Context;
    _data: Dict<Dict<string>>;
    _presets: Dict<I18n.Renderer>;
    locales: LocaleTree;
    constructor(ctx: Context, config: I18n.Config);
    fallback(locales: string[]): string[];
    compare(expect: string, actual: string, options?: CompareOptions): number;
    get(key: string, locales?: string[]): Dict<string>;
    private set;
    define(locale: string, dict: I18n.Store): () => void;
    define(locale: string, key: string, value: I18n.Node): () => void;
    find<P extends string>(pattern: P, actual: string, options?: I18n.FindOptions): I18n.FindResult<P>[];
    _render(value: I18n.Node, params: any, locale: string): string[] | import("@spakjs/message").Fragment<any> | undefined;
    /** @deprecated */
    text(locales: string[], paths: string[], params: object): any;
    render(locales: string[], paths: string[], params: object): string[] | import("@spakjs/message").Fragment<any> | undefined;
}
export declare namespace I18n {
    interface Config {
        locales?: string[];
    }
    const Config: Schema<Config>;
}
export {};
//# sourceMappingURL=i18n.d.ts.map