// ===== spm dev — development mode =====
//
//   spm dev -i <app> [-n <name>] [-v <version>] [-o <dir>] [--no-hmr]
//
// Default (HMR mode): poll the dependency files (mtime/size); on change,
// incrementally rebuild and hot-restart the node child process — a
// second-level feedback loop equivalent to an in-memory hot reload.
//
// --no-hmr mode: on every change, run a full SEA binary build and restart
// the real binary — behavior identical to the final artifact (build-time
// simulation).
//
// Note: esbuild's context.watch is intentionally NOT used — some
// environments (containers/overlayfs) suffer inotify event storms that
// trigger endless rebuilds on zero changes. Polling is most reliable here.

import { spawn, ChildProcess } from 'child_process'
import { statSync, mkdirSync } from 'fs'
import { resolve, basename, dirname } from 'path'
import kleur from 'kleur'
import * as esbuild from 'esbuild'
import { resolveEntry, createBundleSetup, appEntryVirtual, spakMonorepoPlugin } from './build'
import { sealToBinary } from './build/sea'

export interface DevOptions {
  input: string
  name?: string
  version?: string
  outDir?: string
  /** true = full SEA rebuild on every change (binary simulation); default is HMR hot restart */
  noHmr?: boolean
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function runDev(opts: DevOptions): Promise<void> {
  const entry = resolveEntry(opts.input)
  const name = opts.name || basename(dirname(entry))
  const version = opts.version || '0.0.1'
  const outDir = resolve(process.cwd(), opts.outDir || 'dist')
  const devDir = resolve(outDir, '.dev')
  mkdirSync(devDir, { recursive: true })

  const setup = createBundleSetup(process.cwd())
  const virtual = appEntryVirtual(entry)
  const banner = `// spak-dev:${name}:${version}`
  const outfile = resolve(devDir, 'bundle.cjs')
  const binaryOut = resolve(outDir, `${name}-${version}`)

  const esbuildOpts: esbuild.BuildOptions = {
    entryPoints: [setup.bootPath],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node24',
    outfile,
    plugins: [spakMonorepoPlugin(), virtual, ...setup.plugins],
    define: {
      __dirname: '"/spak"',
      __filename: '"/spak/boot.js"',
    },
    external: ['node:sea'],
    sourcemap: false,
    metafile: true,
    banner: { js: banner },
    logLevel: 'silent',
  }

  let child: ChildProcess | null = null
  const stopChild = () => {
    if (child && !child.killed) {
      try { child.kill('SIGKILL') } catch {}
      child = null
    }
  }
  const spawnChild = (cmd: string, args: string[]) => {
    stopChild()
    child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, SPAK_DEV: '1', SPAK_APP_NAME: name } })
    child.on('exit', () => { child = null })
  }

  console.log(kleur.cyan(`\n  ● spm dev ${kleur.bold(name)}/${kleur.green(version)}`))
  console.log(kleur.dim(`    watch: ${entry}`))
  console.log(kleur.dim(`    mode : ${opts.noHmr ? 'SEA rebuild (binary simulation)' : 'HMR hot restart'}`))

  // ---- Initial build + start ----
  let ctx: esbuild.BuildContext
  try {
    ctx = await esbuild.context(esbuildOpts)
    await ctx.rebuild()
  } catch (err) {
    console.error(kleur.red(`  ✗ initial build failed: ${(err as Error).message}`))
    process.exit(1)
  }

  if (opts.noHmr) {
    try {
      await sealToBinary({ bundlePath: outfile, outputPath: binaryOut })
      spawnChild(binaryOut, [])
    } catch (err) {
      console.error(kleur.red(`  ✗ SEA sealing failed: ${(err as Error).message}`))
    }
  } else {
    spawnChild(process.execPath, [outfile])
  }

  // ---- Dependency polling (mtime+size) ----
  // NOTE: the initial snapshot must be taken BEFORE the first build,
  // otherwise edits made during the first build are swallowed.
  let watched: string[] = [entry]
  let snap = new Map<string, string>()
  const snapshot = (): Map<string, string> => {
    const m = new Map<string, string>()
    for (const f of watched) {
      try {
        const st = statSync(f)
        m.set(f, `${st.mtimeMs}:${st.size}`)
      } catch {
        m.set(f, 'gone')
      }
    }
    return m
  }
  snap = snapshot()

  /** Merge newly added watched keys into the snapshot (do not overwrite old keys). */
  const ensureKeys = () => {
    const cur = snapshot()
    for (const f of watched) {
      if (!snap.has(f)) snap.set(f, cur.get(f) ?? 'gone')
    }
  }

  let busy = false
  let queued = false

  const rebuild = async () => {
    busy = true
    try {
      // Refresh the watched set from the current build's inputs
      const res = await ctx.rebuild()
      watched = [...new Set([
        entry,
        ...Object.keys(res.metafile?.inputs || {})
          .filter(p => typeof p === 'string' && !p.includes('spak-internal:')),
      ])].map(p => resolve(process.cwd(), p))

      if (opts.noHmr) {
        await sealToBinary({ bundlePath: outfile, outputPath: binaryOut })
        spawnChild(binaryOut, [])
        console.log(kleur.green(`  ✓ SEA rebuilt + binary restarted`))
      } else {
        spawnChild(process.execPath, [outfile])
        console.log(kleur.green(`  ✓ rebuilt + restarted`))
      }
      ensureKeys()
    } catch (err) {
      console.error(kleur.red(`  ✗ rebuild failed: ${(err as Error).message}`))
    } finally {
      busy = false
    }
  }

  const requestRebuild = async () => {
    if (busy) { queued = true; return }
    await rebuild()
    if (queued) { queued = false; void requestRebuild() }
  }

  console.log(kleur.green(`  ✓ ready. Edit sources to rebuild (Ctrl+C to exit)\n`))

  // Polling loop
  const poll = async () => {
    for (;;) {
      await sleep(400)
      const cur = snapshot()
      let changed = false
      for (const f of watched) {
        if (cur.get(f) !== snap.get(f)) { changed = true; break }
      }
      if (changed) {
        // Lock the snapshot immediately to avoid repeated triggers
        snap = cur
        void requestRebuild()
      }
    }
  }
  void poll()

  process.on('SIGINT', async () => {
    await ctx.dispose()
    stopChild()
    process.exit(0)
  })
}