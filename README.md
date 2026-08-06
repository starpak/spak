# Spak ✨

> A multi-file service project framework based on Koishi

> **Framework Version**: v0.0.8
> **中文版**: [README.zh.md](README.zh.md)

---

## What is Spak?

**Spak** is a **multi-file service project framework** built on top of [Koishi](https://koishi.chat/). It provides a structured way to organize plugin-based applications with built-in support for configuration management, internationalization, CLI tooling, service orchestration, and an independent logging system.

Spak uses **TypeScript** with a **pnpm monorepo** architecture.

---

## Packages

| Package | Description |
|---------|-------------|
| `@spakjs/core` 🧠 | Core framework: commands, middleware, i18n, permissions, schemas, session management |
| `@spakjs/cli` 🎮 | CLI entry point: `spak serve`, `spak config`, `spak cpc`, `spak status`. All outputs are colorized and human-friendly. |
| `@spakjs/loader` 📂 | Config loader, supports YAML/JSON. Handles env files, plugin resolution and lifecycle. |
| `@spakjs/config` ⚙️ | Central configuration manager, persists to `~/.spak/config.json`. |
| `@spakjs/i18n` 🌐 | Integrated i18n: locale tree, fallback algorithm, yml translation loader, `T()` helper. |
| `@spakjs/log` 📝 | **Independent logging module** — multi-transport logger (Console/File/Stream), log levels, structured logging, with Cordis Logger bridge. |
| `@spakjs/message` 💬 | Message helpers and element utilities. |
| `@spakjs/util` 🧰 | Utility functions: command declarations, object observation, string interpolation, misc helpers. |

## Plugins

| Plugin | Description |
|--------|-------------|
| `@spakjs/plugin-server` 🖥️ | Server service and routing (HTTP/Socket). |
| `@spakjs/plugin-http` 🌐 | HTTP and WebSocket client. |
| `@spakjs/plugin-hmr` 🔥 | Hot Module Replacement for development. |
| `@spakjs/plugin-daemon` 👻 | Background daemon process — routes logs to file, detaches from terminal. |

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
plugins:
  '@spakjs/plugin-server':
    host: 0.0.0.0
    port: 4321
  '@spakjs/plugin-http': null
  '@spakjs/plugin-daemon':
    enabled: true
    logFile: spak.log
```

### Run

```bash
# Start the application (colorized, human-friendly logs)
spak serve

# Or specify a config file
spak serve ./spak.config.yml

# Check runtime status
spak serve status

# Stop the running instance
spak serve --stop
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
spak cpc circuit <plugin-name>
```

---

## Project Structure

```
spak/
├── packages/        # Core packages
│   ├── core/        # Framework core (commands, i18n, middleware, ...)
│   ├── spak-cli/    # CLI entry (serve, config, cpc commands)
│   ├── loader/      # Config + plugin loader
│   ├── config/      # Central configuration manager
│   ├── i18n/        # Translation engine + LocaleTree
│   ├── log/         # 🆕 Independent multi-transport logger
│   ├── message/     # Message element helpers
│   └── util/        # Utility library
├── plugins/         # Plugins
│   ├── server/      # HTTP/Socket server
│   ├── http/        # HTTP/WebSocket client
│   ├── hmr/         # Hot module reload
│   └── daemon/      # Background daemon + log routing
└── spak.config.yml
```

---

## License

MIT License. Copyright © Spak Team
