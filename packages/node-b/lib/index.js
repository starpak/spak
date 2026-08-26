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
import { readFile, writeFile, access, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const DEFAULT_WHITELIST = 'node-b.whitelist.json';
/** Compute a content fingerprint for a directory of source entry points. */
export async function fingerprint(root, entries) {
    const hash = createHash('sha256');
    for (const rel of entries) {
        const p = resolve(root, rel);
        try {
            const buf = await readFile(p);
            hash.update(rel).update('\0').update(buf);
        }
        catch {
            // Missing entry contributes an empty slot so the fingerprint still
            // changes if a file disappears.
            hash.update(rel).update('\0missing');
        }
    }
    return hash.digest('hex').slice(0, 16);
}
export async function readWhitelist(path) {
    try {
        await access(path);
        const raw = await readFile(path, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    }
    catch {
        // No file yet — empty whitelist.
    }
    return {};
}
export async function writeWhitelist(path, map) {
    const dir = dirname(path);
    await mkdir(dir, { recursive: true });
    await writeFile(path, JSON.stringify(map, null, 2) + '\n', 'utf8');
}
/**
 * Build a plugin package if it is not already whitelisted (or if `force`).
 * Returns metadata about whether this run was skipped or actually built.
 */
export async function buildPackage(name, entries, opts = {}) {
    const root = opts.root ?? process.cwd();
    const outDir = opts.outDir ?? 'dist';
    const whitelistPath = opts.whitelistPath ?? resolve(root, DEFAULT_WHITELIST);
    const absOut = resolve(root, outDir);
    const fp = await fingerprint(root, entries);
    const existing = await readWhitelist(whitelistPath);
    if (!opts.force && existing[name] === fp) {
        return {
            ok: true, skipped: true, built: false,
            name, fingerprint: fp, outDir: absOut,
            message: `whitelisted: ${name} already built (skip)`,
        };
    }
    // Perform the build. This is the extension seam: a real implementation would
    // spawn tsc / vite / esbuild here. For the skeleton we just ensure the out
    // dir exists and write a build stamp.
    await mkdir(absOut, { recursive: true });
    await writeFile(join(absOut, `${name}.stamp.json`), JSON.stringify({ name, fingerprint: fp }, null, 2) + '\n', 'utf8');
    // Record to whitelist so the next run skips.
    existing[name] = fp;
    await writeWhitelist(whitelistPath, existing);
    return {
        ok: true, skipped: false, built: true,
        name, fingerprint: fp, outDir: absOut,
        message: `built: ${name} → ${outDir} (whitelisted)`,
    };
}
//# sourceMappingURL=index.js.map