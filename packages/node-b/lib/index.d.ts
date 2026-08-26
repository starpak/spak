/**
 * @spakjs/node-b — Spak front-end build cache tool.
 *
 * Purpose: many UI "plugin bundles" (small JS/CSS modules that the web shell
 * loads on demand) only need to be built once. node-b builds a package once,
 * records its identity in a whitelist, and skips re-building it on later runs.
 *
 * This is a *pure frontend* cache: it deals only with produced bundle artifacts
 * and a whitelist file. It makes no backend/runtime connections.
 */
export interface BuildOptions {
    /** Plugin package source directory (defaults to cwd). */
    root?: string;
    /** Output directory the bundle is written to (defaults to `dist`). */
    outDir?: string;
    /** Whitelist file path (defaults to `<root>/node-b.whitelist.json`). */
    whitelistPath?: string;
    /** Whether to force a rebuild even if whitelisted. */
    force?: boolean;
}
export interface BuildResult {
    ok: boolean;
    skipped: boolean;
    built: boolean;
    name: string;
    fingerprint: string;
    outDir: string;
    message: string;
}
/** Compute a content fingerprint for a directory of source entry points. */
export declare function fingerprint(root: string, entries: string[]): Promise<string>;
export declare function readWhitelist(path: string): Promise<Record<string, string>>;
export declare function writeWhitelist(path: string, map: Record<string, string>): Promise<void>;
/**
 * Build a plugin package if it is not already whitelisted (or if `force`).
 * Returns metadata about whether this run was skipped or actually built.
 */
export declare function buildPackage(name: string, entries: string[], opts?: BuildOptions): Promise<BuildResult>;
//# sourceMappingURL=index.d.ts.map