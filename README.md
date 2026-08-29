# Spak ✨

> A multi-file service project framework based on Koishi

> **Framework Version**: v0.1.0
> **中文版**: [README.zh.md](README.zh.md)

---

## What is Spak?

**Spak** is a **enterprise-grade AI Agent platform** (v0.1.0) built on top of [Koishi](https://koishi.chat/). It provides a complete framework for developing, deploying, and managing AI Agents with built-in support for:

- ✨ **Agent SDK** - Enterprise-grade AI Agent development framework
- 🧰 **Tool System** - Rich tool ecosystem with permission control
- 🌐 **Provider System** - Support for OpenAI, Anthropic, Google, and more
- 📋 **Template System** - Pre-built Agent templates for quick start
- 📊 **Metrics & Monitoring** - Comprehensive metrics collection and monitoring
- 🎛️ **Configuration Management** - Centralized configuration management
- 🌍 **i18n** - Multi-language support (zh/en)
- 🖥️ **CLI Tooling** - User-friendly CLI commands
- 📝 **Independent Logging** - Multi-transport logging system

Spak uses **TypeScript** with a **pnpm monorepo** architecture.

---

## Packages

| Package | Description |
|---------|-------------|
| `@spakjs/core` 🧠 | **Framework core**: commands, middleware, i18n, permissions, Schema, session management. |
| `@spakjs/cli` 🎮 | CLI entry point: `spak serve`, `spak config`, `spak cpc`, `spak init-locales`. All outputs are colorized and human-friendly. |
| `@spakjs/loader` 📂 | Config loader, supports YAML/JSON. Handles env files, plugin resolution and lifecycle. |
| `@spakjs/config` ⚙️ | Central configuration manager, persists to `~/.spak/config.json`. |
| `@spakjs/i18n` 🌐 | Integrated i18n: locale tree, fallback algorithm, yml translation loader, `T()` helper. |
| `@spakjs/log` 📝 | **Independent logging module** — multi-transport logger (Console/File/Stream), log levels, structured logging, with Cordis Logger bridge. |
| `@spakjs/message` 💬 | Message helpers and element utilities. |
| `@spakjs/util` 🧰 | Utility functions: command declarations, object observation, string interpolation, misc helpers. |
| `@spakjs/agent` 🤖 | Agent SDK: management, tools, providers, templates, and metrics. |
| `@spakjs/node-b` 🧰 | Node bridge utilities. |

> Spak currently ships **no built-in plugins**. Plugins are loaded from `spak.config.yml` / `~/.spak/config.json` (see below).

---

## i18n — Multi-language Support 🌐

Spak now ships with **handwritten** translations for:

| Language | Config value |
|----------|-------------|
| 🇬🇧 English | `en` |
| 🇨🇳 简体中文 | `zh` |

Switch language via:
```bash
spak config set language zh   # switch to Chinese
spak config set language en   # switch back to English
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
pnpm build
```

### Configuration

Create **spak.config.yml**:

```yaml
name: my-spak-app
version: 0.1.0
plugins: {}
```

### Run

```bash
# Start the application (colorized, human-friendly logs)
spak serve

# Or specify a config file
spak serve ./spak.config.yml

# Stop the running instance
spak serve --stop

# Restart / force-kill the running instance
spak serve --restart
spak serve --kill
```

### CLI Commands

```bash
# Manage configuration
spak config get <key>
spak config set <key> <value>
spak config list

# Plugin security checks (CPC)
spak cpc check
spak cpc status
spak cpc sandbox <plugin-name>
spak cpc ssetps
spak cpc circuit <plugin-name>

# Inject i18n into workspace packages
spak init-locales
```

---

## Project Structure

```
spak/
├── bin/             # CLI entry
├── docs/            # Design docs
├── locales/         # Handwritten translation files (zh/en)
├── packages/        # Core packages
│   ├── core/        # Framework core (commands, i18n, middleware, ...)
│   ├── cli/         # CLI entry (serve, config, cpc commands)
│   ├── loader/      # Config + plugin loader
│   ├── config/      # Central configuration manager
│   ├── i18n/        # Translation engine + LocaleTree
│   ├── log/         # Independent multi-transport logger
│   ├── message/     # Message element helpers
│   ├── util/        # Utility library
│   ├── agent/       # Agent SDK
│   └── node-b/      # Node bridge utilities
├── src/             # Workspace root entry
├── run/             # Build scripts
└── spak.config.yml
```

---

## License

MIT License. Copyright © Spak Team
