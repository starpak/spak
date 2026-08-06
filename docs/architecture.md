# Spak Architecture

> 面向使用者的架构总览。内部职责边界与重构决策记录见根目录
> [MODULE_DIVISION.md](../MODULE_DIVISION.md)。

## 一句话

**core 是引擎，spak 是把引擎装配好交付的整车。** 你可以单独用 `@spakjs/core`，
也可以直接 `import { createApp } from 'spak'` 一行起步。

## 包依赖图

```
                       spak (Facade / 整车入口)
                              │ re-exports
  ┌────────────┬──────────────┼──────────────┬──────────────┐
  │            │              │              │              │
 CLI        Plugins        Loader         Config         I18n
spak-cli   daemon/hmr/     NodeJS         ~/.spak/      LocaleTree
           server/http     yml+fork       JSON store    + T()
  │            │              │              │              │
  └────────────┴──────────────┴──────────────┴──────────────┘
                              │
                         @spakjs/core
                  Context / Commander / Middleware
                  Permissions / Schema / I18n render
                  Session / Filter
                              │
              ┌───────────────┴───────────────┐
        @spakjs/util                      @spakjs/message
        纯函数（零副作用）                  h()/Fragment（零副作用）
                              │
                         @spakjs/log
                  多 transport logger（Node 层）
```

## 分层规则

| 层 | 包 | 可用 Node IO | 可依赖的 @spakjs/* |
|---|---|---|---|
| **零副作用底座** | `util`, `message` | ❌ | 无（最底层） |
| **Node 能力层** | `log`, `config`, `i18n`, `loader` | ✅ | util / message |
| **运行时内核** | `core` | ❌（除 i18n loader 一处） | util / message / i18n |
| **门面** | `spak` | — | 全部 re-export |
| **插件** | `daemon`, `hmr`, `server`, `http` | ✅ | core / loader / i18n / util / message / log |

铁律：依赖方向永远「右上 → 左下」，任何 `@spakjs/*` 包都不得 `import 'spak'`。

## 入口选择

- 想要完整整车：`import { createApp } from 'spak'`
- 只想要内核跑命令系统：`import { Context } from '@spakjs/core'`
- 只想转义/解析消息：`import { h } from '@spakjs/message'`（8KB，无 cordis 依赖）
- 想要结构化日志：`import { createLogger } from '@spakjs/log'`（零第三方依赖）
- 想要 CLI：全局 `npm i -g spak` 后用 `spak serve` / `spak config` / `spak cpc`
