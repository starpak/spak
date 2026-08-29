# Spak ✨

> A multi-file service project framework based on Koishi

> **Framework Version**: v1.0.0
> **中文版**: [README.zh.md](README.zh.md)

---

## What is Spak?

**Spak** is a **enterprise-grade AI Agent platform** (v1.0.0) built on top of [Koishi](https://koishi.chat/). It provides a complete framework for developing, deploying, and managing AI Agents with built-in support for:

- ✨ **Agent SDK** - Enterprise-grade AI Agent development framework
- 🧰 **Tool System** - Rich tool ecosystem with permission control
- 🌐 **Provider System** - Support for OpenAI, Anthropic, Google, and more
- 📋 **Template System** - Pre-built Agent templates for quick start
- 📊 **Metrics & Monitoring** - Comprehensive metrics collection and monitoring
- 🎛️ **Configuration Management** - Centralized configuration management
- 🌍 **i18n** - Multi-language support (zh/en)
- 🖥️ **CLI Tooling** - `spm` package manager + runtime control
- 📦 **封闭二进制构建** - `spm build` 产出自包含 SEA 单文件二进制（框架 + APP 内嵌），任何同架构 Linux 免 Node 直跑
- 📝 **Independent Logging** - Multi-transport logging system

Spak uses **TypeScript** with a **pnpm monorepo** architecture.

---

## Packages

| Package | Description |
|---------|-------------|
| `spm` 📦 | **The Spak CLI** (v0.0.1): build 封闭二进制（`build`/`dev`），runtime control (`serve`/`stop`/`restart`/`kill`/`status`), config & CPC & i18n commands. Commands are injected from `@spakjs/cli` at build time. |
| `@spakjs/core` 🧠 | **Framework core**: commands, middleware, i18n, permissions, Schema, session management. |
| `@spakjs/cli` 🎮 | Command library (injected into `spm`): serve/config/cpc/i18n declarations. |
| `@spakjs/loader` 📂 | Config loader, supports YAML/JSON. Handles env files, plugin resolution and lifecycle. |
| `@spakjs/config` ⚙️ | Central configuration manager, persists to `~/.spak/config.json`. |
| `@spakjs/i18n` 🌐 | Integrated i18n: locale tree, fallback algorithm, yml translation loader, `T()` helper. |
| `@spakjs/log` 📝 | **Independent logging module** — multi-transport logger (Console/File/Stream), log levels, structured logging, with Cordis Logger bridge. |
| `@spakjs/message` 💬 | Message helpers and element utilities. |
| `@spakjs/util` 🧰 | Utility functions: command declarations, object observation, string interpolation, misc helpers. |
| `@spakjs/agent` 🤖 | Agent SDK: management, tools, providers, templates, and metrics. |
| `@spakjs/mlang` 🌐 | Language model abstraction layer. |
| `@spakjs/node-b` 🧰 | Node bridge utilities & front-end build cache. |
| `@spakjs/apps` 📦 | Apps runtime: manifest 规范, HMR watcher, INO conflict system. |

> **CLI ownership**: `spm` is the single CLI. `spak` is now a pure runtime identity (only `spak -v`; everything else guides you to `spm`). Plugins are loaded from `spak.config.yml` / `~/.spak/config.json` (see below).

---

## i18n — Multi-language Support 🌐

Spak now ships with **handwritten** translations for:

| Language | Config value |
|----------|-------------|
| 🇬🇧 English | `en` |
| 🇨🇳 简体中文 | `zh` |

Switch language via:
```bash
spm config set language zh   # switch to Chinese
spm config set language en   # switch back to English
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 10

### Setup

```bash
pnpm install

# Build all packages
pnpm build   # or: bash run/build.sh
```

### Configuration

Create **spak.config.yml**:

```yaml
name: my-spak-app
version: 1.0.0
plugins: {}
```

### Run

```bash
# Start the application (colorized, human-friendly logs)
spm serve

# Or specify a config file
spm serve ./spak.config.yml

# Stop / restart / force-kill the running instance
spm serve --stop
spm serve --restart
spm serve --kill

# Check the running instance
spm serve status
```

### Build sealed binaries (`spm`)

```bash
# Build an app under APPS/ (a directory defaults to the master entry of
# spak.manifest.json) into a self-contained single-file binary:
# framework runtime + embedded APP, runs on any same-arch Linux, no Node needed
spm build -i APPS/hello -n hello -v 1.0.0     # → dist/hello-1.0.0 (~118MB)

# Development mode: watch sources, HMR hot restart by default (second-level loop)
spm dev -i APPS/hello -n hello -v 1.0.0

# --no-hmr: full SEA binary rebuild on every change (identical to final artifact)
spm dev -i APPS/hello --no-hmr

# The artifact runs directly: no args = executes the APP entry;
# -h/-v = framework help/version; framework command args = command surface
./dist/hello-1.0.0
```

### CLI Commands

```bash
# Manage configuration
spm config get <key>
spm config set <key> <value>
spm config list

# Plugin security checks (CPC)
spm cpc check
spm cpc status
spm cpc sandbox <plugin-name>
spm cpc ssetps
spm cpc circuit <plugin-name>

# i18n key management (scan packages, append missing keys)
spm i18n init        # append missing keys (key-only, empty content)
spm i18n check       # dry-run: report missing keys without writing

# Inject i18n into workspace packages
spm init-locales
```

---

## Project Structure

```
spak/
├── bin/             # CLI entry: spak (runtime) + spm (package manager)
├── docs/            # Design docs
├── locales/         # Handwritten translation files (zh/en)
├── packages/        # Core packages
│   ├── core/        # Framework core (commands, i18n, middleware, ...)
│   ├── cli/         # Command library (injected into spm)
│   ├── spm/         # The Spak CLI: package manager + runtime control
│   ├── apps/        # Apps runtime: manifest 规范, HMR, INO 冲突系统
│   ├── loader/      # Config + plugin loader
│   ├── config/      # Central configuration manager
│   ├── i18n/        # Translation engine + LocaleTree
│   ├── log/         # Independent multi-transport logger
│   ├── message/     # Message element helpers
│   ├── util/        # Utility library
│   ├── agent/       # Agent SDK
│   └── node-b/      # Node bridge utilities
├── .apps/           # Example apps (desktop front-end + Express app server)
├── src/             # Workspace root entry
└── run/             # Build scripts
```

---

## License

MIT License. Copyright © Spak Team
