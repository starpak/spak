# Spak Changelog ✨

> Every step of growth is recorded here! (｡>ω<｡)

> **中文版**: [CHANGELOG.zh.md](CHANGELOG.zh.md)

---

## [0.0.7] — 2026-08-04 🐱

### ✨ Features
- i18n localization fully wired into the CLI (help text, config, serve output)
- Friendly bilingual `spak` intro banner
- Colorized `spak -v` version output
- Embedded `spm` (Spak Package Manager) project built alongside spak
- `.pak` single-file app package format (APK-like) + `spm pack` command
- Server loads `.pak` apps from `~/.spak/.apps`

### 🔧 Fixes
- `bin.js` permission / stale-link resolution issues on build
- `build.sh` compiles `lib/cli/` with the correct rootDir
- Chinese translations now render for serve/config/cpc output
- Removed deprecated plugin config leftovers (`@spakjs/plugin-server` etc.)

---

## [0.0.3] — 2026-07-25 🐱

### ✨ Features
- Initial project structure!
- Core package `@spakjs/core` completed
- CLI tool `@spakjs/cli` is now functional
- Config loader `@spakjs/loader` supports YAML/JSON reading
- Utility package `@spakjs/utils` with handy tools
- Internationalization utilities `@spakjs/i18n-utils` ready

### 🖥️ Plugins
- `@spakjs/plugin-server` server service plugin
- `@spakjs/plugin-http` HTTP related plugin
- `@spakjs/plugin-hmr` hot reload plugin
- `@spakjs/plugin-common` common plugin collection

### 🏗️ Engineering
- pnpm monorepo architecture
- TypeScript strict mode configuration
- MIT open source license
- Cat-style README launched!

---

> Meow～ Previous versions haven't been recorded yet～ Will make up for it next time! (*>ω<*)ﾉ
