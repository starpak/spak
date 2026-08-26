/**
 * A message fragment (a list of child elements with no wrapper tag).
 * Its string form is a flat concatenation of its children.
 */
export declare class Fragment<A extends {} = any> {
    readonly attrs: A;
    readonly children: any[];
    constructor(attrs: A, children: any[]);
    toString(): string;
    get length(): number;
    map<U>(cb: (el: any, i: number, arr: any[]) => U): U[];
    forEach(cb: (el: any, i: number, arr: any[]) => void): void;
    join(separator?: string): string;
    filter(pred: (el: any, i: number, arr: any[]) => boolean): any[];
    reduce<U>(cb: (acc: U, el: any, i: number) => U, initial: U): U;
    [Symbol.iterator](): Iterator<any>;
}
/** Recursively escape XML text content: `& < > " '`  */
export declare function escape(source: unknown, whitespace?: boolean): string;
/** Unescape XML/HTML entities in text content (both named, decimal, hex). */
export declare function unescape(source: string): string;
/**
 * Hyperscript-like element factory: `h(type, attrs?, ...children)`
 *
 * - `h.text(str)` / `h.parse(str)` / `h.normalize(...)` helpers
 * - Works side-by-side with the `Fragment` class for plain lists.
 */
export declare class h<T extends string = any, A extends {} = any> {
    type: T;
    attrs: A;
    children: any[];
    constructor(type: T, attrs?: A | any[], ...children: any[]);
    toString(): string;
    /** Extract `[type, attrs, children]` tuple for inspection. */
    valueOf(): [T, A, any[]];
    /** Safely wrap a plain string as a "text element" (just the string itself). */
    static text(content: any): string;
    /** Escape XML special characters. Shorthand for the top-level `escape()` helper. */
    static escape: typeof escape;
    /** Unescape XML entities. Shorthand for the top-level `unescape()` helper. */
    static unescape: typeof unescape;
    /**
     * Parse an XML-ish string into a tree of `h` / `Fragment` / string
     * elements.  Designed to round-trip with `.toString()` for the subset
     * of tags that Spak uses (at, img, quote, text, br, p, i18n...).
     *
     * An optional `params` record is accepted for call-site compatibility
     * with `@spakjs/core`'s i18n renderer; when provided the parameter
     * placeholders `{name}` are substituted into the source string *before*
     * parsing (same order as `@spakjs/i18n`'s interpolation helper).
     */
    static parse(source: string, params?: Record<string, any>): Fragment;
    /** Normalize any mixture of strings / arrays / Fragments into a flat array. */
    static normalize(input: any): any[];
}
export default h;
//# sourceMappingURL=index.d.ts.map