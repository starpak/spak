// ===== spm build — closed self-contained binary builder =====
//
//   spm build -i <app> -n <name> -v <version>
//
// Output: dist/<name>-<version> — a self-contained single-file binary (SEA)
// with the framework runtime (core/loader/apps/i18n/cli) and the APP entry
// bundled in. It runs directly on any same-arch Linux without Node.
//
// Pipeline:
//   1. Resolve the entry (file, or a directory via spak.manifest.json's master)
//   2. Collect all locales → virtual module
//   3. esbuild bundle: boot template + framework + APP entry + embedded i18n
//   4. Seal into a SEA binary

import { existsSync, readFileSync, statSync, mkdirSync, rmSync } from 'fs'
import { resolve, dirname, isAbsolute, basename, extname } from 'path'
import * as esbuild from 'esbuild'
import { collectLocales } from './locales'
import { sealToBinary } from './sea'

export interface BuildOptions {
  /** App path: entry file or app directory */
  input: string
  /** App name (defaults to the directory name) */
  name?: string
  /** Version (defaults to 0.0.1) */
  version?: string
  /** Output directory (defaults to <cwd>/dist) */
  outDir?: string
}

export interface BuildResult {
  output: string
  name: string
  version: string
  sizeBytes: number
}

/** Resolve the app entry: a file directly, or a directory via manifest.master / index.*. */
export function resolveEntry(input: string): string {
  const abs = isAbsolute(input) ? input : resolve(process.cwd(), input)
  if (!existsSync(abs)) {
    throw new Error(`Entry not found: ${abs}`)
  }
  const st = statSync(abs)
  if (st.isFile()) return abs

  // Directory: prefer the master field of spak.manifest.json
  const manifestPath = resolve(abs, 'spak.manifest.json')
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      if (manifest && typeof manifest.master === 'string') {
        const master = resolve(abs, manifest.master)
        if (existsSync(master)) return master
      }
    } catch {
      // Invalid manifest: fall back to index.*
    }
  }

  // Directory: fall back to index.js / index.ts / index.mjs
  for (const cand of ['index.ts', 'index.js', 'index.mjs', 'index.cjs']) {
    const p = resolve(abs, cand)
    if (existsSync(p)) return p
  }

  throw new Error(`Cannot find an entry in ${abs} (needs an entry file, spak.manifest.json, or index.*)`)
}

/**
 * Virtual loader for the APP entry module (compiles the user entry source
 * directly so esbuild keeps building its dependency graph).
 */
export function appEntryVirtual(entryPath: string): esbuild.Plugin {
  return {
    name: 'spak-internal',
    setup(build: esbuild.PluginBuild) {
      build.onResolve({ filter: /^spak-internal:app-entry$/ }, () => ({
        path: 'spak-internal:app-entry',
        namespace: 'spak-internal',
      }))
      build.onResolve({ filter: /^spak-internal:locales$/ }, () => ({
        path: 'spak-internal:locales',
        namespace: 'spak-internal',
      }))
      build.onLoad({ filter: /^spak-internal:app-entry$/, namespace: 'spak-internal' }, async () => {
        // Hand the raw source to esbuild for further dependency resolution
        const ext = extname(entryPath).slice(1)
        const loader = ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx' : ext === 'mjs' || ext === 'cjs' ? 'js' : ext === 'ts' ? 'ts' : 'js'
        return {
          contents: readFileSync(entryPath, 'utf-8'),
          loader,
          resolveDir: dirname(entryPath),
        }
      })
    },
  }
}

export interface BundleSetup {
  bootPath: string
  plugins: esbuild.Plugin[]
}

/**
 * Shared bundle pieces (used by both build and dev):
 * the boot entry path plus the embedded-locales virtual module plugin.
 */
export function createBundleSetup(rootDir: string): BundleSetup {
  const locales = collectLocales(rootDir)
  const bootPath = resolve(__dirname, 'boot.js')
  return {
    bootPath,
    plugins: [
      {
        name: 'spak-locales',
        setup(build: esbuild.PluginBuild) {
          build.onLoad({ filter: /^spak-internal:locales$/, namespace: 'spak-internal' }, () => ({
            contents: `module.exports = ${JSON.stringify(locales)}`,
            loader: 'js',
          }))
        },
      },
    ],
  }
}

/**
 * Monorepo fallback resolver plugin:
 * user code under APPS/ is outside pnpm's node_modules link tree, so
 * `@spakjs/*` imports are redirected to packages/<name>/lib artifacts
 * (consistent with how the boot template resolves them).
 */
export function spakMonorepoPlugin(): esbuild.Plugin {
  const monoRoot = resolve(__dirname, '..', '..', '..', '..')
  return {
    name: 'spak-monorepo',
    setup(build) {
      build.onResolve({ filter: /^@spakjs\// }, (args) => {
        const name = args.path.replace('@spakjs/', '')
        const pkgLib = resolve(monoRoot, 'packages', name, 'lib', 'index.js')
        if (existsSync(pkgLib)) {
          return { path: pkgLib, namespace: 'file' }
        }
        // Fall back to source when lib/ is not built yet (dev repo scenario)
        const pkgSrc = resolve(monoRoot, 'packages', name, 'src', 'index.ts')
        if (existsSync(pkgSrc)) {
          return { path: pkgSrc, namespace: 'file' }
        }
        return undefined
      })
    },
  }
}

export async function buildApp(opts: BuildOptions): Promise<BuildResult> {
  const entry = resolveEntry(opts.input)
  const name = opts.name || basename(dirname(entry))
  const version = opts.version || '0.0.1'
  const outDir = resolve(process.cwd(), opts.outDir || 'dist')
  const output = resolve(outDir, `${name}-${version}`)

  if (name.includes('/') || name.includes('..') || /[\s\\]/.test(name)) {
    throw new Error(`Invalid app name: ${name}`)
  }
  if (!/^\d+\.\d+\.\d+/.test(version)) {
    throw new Error(`Invalid version: ${version} (needs semver like 1.0.0)`)
  }

  mkdirSync(outDir, { recursive: true })

  // Intermediate bundle artifact (removed after sealing)
  const bundlePath = resolve(outDir, '.bundle.cjs')

  // Assemble shared bundle pieces (boot entry + locales virtual plugin)
  const setup = createBundleSetup(process.cwd())

  const plugins: esbuild.Plugin[] = [
    spakMonorepoPlugin(),
    appEntryVirtual(entry),
    ...setup.plugins,
  ]

  await esbuild.build({
    entryPoints: [setup.bootPath],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    outfile: bundlePath,
    plugins,
    define: {
      // No real __dirname/__filename inside the binary — provide safe placeholders
      __dirname: '"/spak"',
      __filename: '"/spak/boot.js"',
    },
    external: ['node:sea'],
    sourcemap: false,
    banner: {
      js: `// spak:${name}:${version} sealed binary (SEA)`,
    },
    logLevel: 'info',
  })

  // Seal into a single executable
  try {
    await sealToBinary({ bundlePath, outputPath: output })
  } finally {
    try { rmSync(bundlePath, { force: true }) } catch { /* ignore */ }
  }

  const sizeBytes = existsSync(output) ? statSync(output).size : 0
  return { output, name, version, sizeBytes }
}