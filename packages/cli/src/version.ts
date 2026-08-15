import { readFileSync } from 'fs'
import { join } from 'path'

// Version of @spakjs/cli, read from this package's package.json.
// Kept as a small module so both the CLI banner and createApp() share one source.
let _version = ''
try {
  _version = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')).version
} catch {
  _version = '0.0.0'
}

export const version: string = _version
