import express, { Express, Request, Response } from 'express'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { inflateRawSync } from 'zlib'
import { homedir } from 'os'
import { T } from '@spakjs/i18n'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ===== Minimal ZIP reader (for .pak single-file apps) =====
// Parses the central directory and inflates entries. No external dependency.

interface ZipFileEntry {
  name: string
  data: Buffer
}

function readZip(buf: Buffer): Map<string, Buffer> {
  const result = new Map<string, Buffer>()
  // Find End of Central Directory (EOCD) signature
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) return result

  const cdCount = buf.readUInt16LE(eocd + 10)
  const cdOffset = buf.readUInt32LE(eocd + 16)
  let pos = cdOffset

  for (let n = 0; n < cdCount; n++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) break
    const method = buf.readUInt16LE(pos + 10)
    const compSize = buf.readUInt32LE(pos + 20)
    const uncompSize = buf.readUInt32LE(pos + 24)
    const nameLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)
    const localOffset = buf.readUInt32LE(pos + 42)
    const name = buf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8')

    // Read local header to find data start
    const lh = localOffset
    const lNameLen = buf.readUInt16LE(lh + 26)
    const lExtraLen = buf.readUInt16LE(lh + 28)
    const dataStart = lh + 30 + lNameLen + lExtraLen
    const comp = buf.subarray(dataStart, dataStart + compSize)

    let data: Buffer
    if (method === 0) {
      data = comp
    } else if (method === 8) {
      data = inflateRawSync(comp)
    } else {
      data = Buffer.alloc(0)
    }
    if (!name.endsWith('/')) result.set(name, data)
    pos += 46 + nameLen + extraLen + commentLen
  }
  return result
}

// ===== Route Registry =====
interface RegisteredRoute {
  method: string
  path: string
  app: string
  handler: string
}

interface AppManifest {
  name: string
  version: string
  desktop?: boolean
  routes?: { method: string; path: string; handler: string }[]
  staticDir?: string
}

const routes: RegisteredRoute[] = []
const registeredApps: Map<string, AppManifest> = new Map()
// In-memory file store per app: name → { path → content }
const appFiles: Map<string, Map<string, Buffer>> = new Map()
let desktopApp: string | null = null

const PORT = 4695
const app: Express = express()

app.use(express.json())

// ===== Serve a file from an in-memory pak =====
function servePakFile(appName: string, reqPath: string, res: Response): boolean {
  const files = appFiles.get(appName)
  if (!files) return false
  // Normalize: strip leading '/', default to index.html
  let rel = reqPath.replace(/^\/+/, '')
  if (!rel) rel = 'index.html'
  // Prefer exact match, else app/<rel> (pak keeps resources under app/)
  const candidates = [rel, join('app', rel), rel.replace(/^app\//, '')]
  for (const cand of candidates) {
    const data = files.get(cand)
    if (data) {
      const ext = cand.split('.').pop() || ''
      const mime: Record<string, string> = {
        html: 'text/html', htm: 'text/html', js: 'application/javascript',
        mjs: 'application/javascript', css: 'text/css', json: 'application/json',
        svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        ico: 'image/x-icon', txt: 'text/plain', map: 'application/json',
      }
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
      res.send(data)
      return true
    }
  }
  return false
}

// ===== API: Register an app =====
app.post('/api/register', (req: Request, res: Response) => {
  const manifest: AppManifest = req.body
  if (!manifest.name) {
    res.status(400).json({ error: T('spak.server.manifest_name_required') })
    return
  }
  registeredApps.set(manifest.name, manifest)
  if (manifest.desktop && !desktopApp) {
    desktopApp = manifest.name
    console.log(T('spak.server.desktop_selected', { name: desktopApp }))
  }
  if (manifest.routes) {
    for (const route of manifest.routes) {
      routes.push({ method: route.method, path: route.path, app: manifest.name, handler: route.handler })
    }
  }
  console.log(T('spak.server.app_registered', { name: manifest.name }))
  res.json({ ok: true, desktop: desktopApp })
})

// ===== API: Get all routes =====
app.get('/api/routes', (_req: Request, res: Response) => {
  res.json({ routes })
})

// ===== API: Get current desktop =====
app.get('/api/desktop', (_req: Request, res: Response) => {
  res.json({ app: desktopApp })
})

// ===== Serve desktop app at root =====
app.get('/', (_req: Request, res: Response) => {
  if (desktopApp) {
    if (servePakFile(desktopApp, 'index.html', res)) return
  }
  res.json({ server: 'Spak Server', port: PORT, desktop: desktopApp, apps: [...registeredApps.keys()] })
})

// ===== Catch-all: serve static assets from in-memory pak =====
// Handles /assets/*, /index.html, and any other static file references
// that the desktop app's HTML might request.
app.get('*', (req: Request, res: Response) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'not found' })
    return
  }
  // Try desktop app first
  if (desktopApp && servePakFile(desktopApp, req.path, res)) return
  // Then try any registered app by matching route prefix
  for (const [appName, manifest] of registeredApps) {
    if (appName === desktopApp) continue
    const prefix = manifest.routes?.find(r => req.path.startsWith(r.path.split('/:')[0]))
    if (prefix && servePakFile(appName, req.path, res)) return
  }
  // Fallback: try every app's pak files
  for (const appName of registeredApps.keys()) {
    if (servePakFile(appName, req.path, res)) return
  }
  // SPA fallback: serve index.html for client-side routing
  if (desktopApp && servePakFile(desktopApp, 'index.html', res)) return
  res.status(404).send(T('spak.server.not_found'))
})

// ===== Auto-discover .pak apps from ~/.spak/.apps =====
function discoverApps() {
  const appsDir = resolve(homedir(), '.spak', '.apps')
  if (!existsSync(appsDir)) {
    console.warn(T('spak.server.app_dir_not_found', { dir: appsDir }))
    return
  }
  try {
    const entries = readdirSync(appsDir).filter(f => f.endsWith('.pak'))
    for (const pakFile of entries) {
      try {
        const pakPath = resolve(appsDir, pakFile)
        const buf = readFileSync(pakPath)
        const files = readZip(buf)
        const manifestRaw = files.get('spak.app.json')
        if (!manifestRaw) {
          console.warn(T('spak.server.app_no_manifest', { pak: pakFile }))
          continue
        }
        const manifest: AppManifest = JSON.parse(manifestRaw.toString('utf8'))
        if (!manifest.name) {
          console.warn(T('spak.server.app_no_name', { pak: pakFile }))
          continue
        }
        registeredApps.set(manifest.name, manifest)
        appFiles.set(manifest.name, files)
        if (manifest.desktop && !desktopApp) {
          desktopApp = manifest.name
          console.log(T('spak.server.desktop_auto', { name: desktopApp }))
        }
        if (manifest.routes) {
          for (const route of manifest.routes) {
            routes.push({ method: route.method, path: route.path, app: manifest.name, handler: route.handler })
          }
        }
        console.log(T('spak.server.app_discovered', { name: manifest.name, pak: pakFile }))
      } catch (err) {
        console.warn(T('spak.server.app_load_failed', { pak: pakFile, error: (err as Error).message }))
      }
    }
  } catch (err) {
    console.warn(T('spak.server.app_discovery_failed', { error: (err as Error).message }))
  }
}

// ===== Start =====
discoverApps()

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`)
  console.log(`  ║       S P A K   S E R V E R          ║`)
  console.log(`  ╚══════════════════════════════════════╝`)
  console.log(T('spak.server.started', { port: String(PORT) }))
  console.log(T('spak.server.desktop', { name: desktopApp || T('spak.server.desktop_none') }))
  console.log(T('spak.server.routes', { count: String(routes.length) }))
  console.log(T('spak.server.apps', { apps: [...registeredApps.keys()].join(', ') || T('spak.server.apps_none') }))
  console.log('')
})
