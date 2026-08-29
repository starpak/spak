# Spak Changelog ✨

> Every step of growth is recorded here! (｡>ω<｡)

> **中文版**: [CHANGELOG.zh.md](CHANGELOG.zh.md)

---

## [Unreleased]

### ✨ Features
- **CPC security hardening**：
  - **manifest permissions** — executable apps must declare `network`/`fs`/`childProcess` in `spak.app.json`; missing or invalid declarations are rejected by the `spm install` auditor (fail-closed, minimal by default); `spm info` now prints the granted permissions.
  - **real network firewall** — net/tls-layer `allow`/`deny` rules (default `allow: localhost`, `deny: external`), fail-closed (no rule match → blocked); installed on CPC startup; sandbox workers inherit rules via `SPAK_FIREWALL_RULES` env (`ECFWACCESS` / `CFW-DENY`).
  - **hardened sandbox** — real plugin entry loading (package.json `main` → `spak.manifest.json` master → `require.resolve`), per-worker V8 heap cap (`NODE_OPTIONS --max-old-space-size`), self RSS guard reporting `overbudget` → parent opens the circuit breaker and terminates the worker.
  - **i18n everywhere** — all user-visible CLI output routed through locales (143 keys, zh/en symmetric); split per-package locale shards into `packages/*/src/locales` (authoritative source remains root `locales/`).

### 🐛 Fixes
- **`spm` 成为唯一 CLI（v0.0.1）**：恢复并重构 Spak 包管理器为正式 CLI——
  - **包管理**：`spm pack`（.pak 单文件打包）、`spm list` / `spm info` / `spm uninstall` / `spm publish`（本地 registry `data/.registry`）、`spm install`（带**安全审查者**：防 zip-slip 路径穿越、可执行内容需 manifest 声明 `exec`/`desktop`，非法拒绝）。
  - **运行时启停**：`spm serve [--stop/--restart/--kill]`、`spm serve status`（修复后台运行保活：stdin 方案改为 timer，setsid/nohup 不再意外退出）。
  - **i18n 迁移**：`spm i18n init`（扫描补 key）+ 新增 `spm i18n check`（干跑只报告不写文件）。
  - **注入架构（用户方案）**：命令实现全部保留在 `@spakjs/cli`，spm 壳构建时统一注册（先编 cli 再编 spm）。
- **`packages/apps`（@spakjs/apps）恢复**：.pak 运行时（manifest / HMR / INO），全量编译通过（修复 hmr.ts 严格性错误 9 处 + util `Dict` 泛型化）。
- **`spak` 转为纯运行时身份 v1.0.0**：`bin.js` 仅保留 `-v` 版本响应，其余引导使用 `spm`；所有运行时包同步升 v1.0.0。
- **`.apps` 样例恢复**：desktop（React+Vite，构建后 pack → install → 由 apps/server express 在 :4695 服务）全链路打通。
- **CPC 白名单**：`apps` / `@spakjs/apps` / `spm` / `@spakjs/spm` 纳入白名单（spm 豁免自身 + 作为审查者）。
- **`spm i18n init` 命令**：遍历所有包源码提取 `T()`/`t()` 的 i18n key，将未收录进 `locales/{zh,en-US}.yml` 的 key 以「仅 key、空内容」形式追加补全（幂等、不破坏原有内容）。

### 🐛 Fixes
- **`--file` 选项解析修复**：registry 中 option 统一注册为 `--<name> [<name>]`（此前仅有 default 的 option 才能吃值，spm 的 `--out`/`--file` 被解析成布尔 flag）；argv 位置提取跳过 option 及其值。
- **`.pak` 打包语义修正**：声明 `staticDir` 的静态应用只打包构建产物（dist），配置了但目录缺失则报错——防止源码/构建配置误入包；server 型应用打包整个运行目录。
- **编译错误全面修复**：`@spakjs/util` `defineEnumProperty` 的 TS7053、`@spakjs/core` schema 的 symbol 索引访问、`@spakjs/loader` shared 类型（EffectScope/ForkScope、`ensureScopeRecord` 等），`pnpm build` 全量通过。
- **命令解析器修复**：`h.parse()` 返回 Fragment（children 为普通字符串）而非 koishi 风格的 text 元素数组，导致文本节点被误当元素、空白被转义、整串退化成一个 token；现正确识别字符串文本节点。新增 `img` 领域以匹配既有测试。
- **测试套件修复**：移除依赖已废弃子系统（koishi 分层 API / satori / 内存数据库）的死测试；`parser.spec.ts` 现 19 项全绿。
- **幽灵引用清理**：删除配置与 CPC 白名单中不存在的 `plugin-server` / `plugin-http` / `plugin-hmr` / `plugin-daemon` 引用；清空 `data/config.json` 旧版 `server` 残留。
- **i18n 补齐**：zh / en 全集对齐（135 个 key 对称，含全部 `spak.spm.*` 与新增 `i18n.check_clean`/`dry_run`/`static_dir_missing`）。
- **构建门禁**：接入 `simple-git-hooks`，`pre-commit` 必跑 `pnpm build && pnpm test`，编译不过一律阻止提交。
- **文档对齐**：README（中/英）以 spm 为唯一 CLI，版本 v1.0.0；SPAK_ROADMAP / MODULE_DIVISION 同步架构变更。

---

## [0.1.0] — 2026-08-13 🚀

### ✨ Features
- **完整的 Agent SDK** - 企业级 AI Agent 开发框架
  - Agent 管理（创建、查询、更新、删除、启用/禁用）
  - 状态监控（IDLE, BUSY, ERROR, STOPPED, CRASHED）
  - 指标收集（请求数、响应时间、Token 使用量、成本等）
- **工具系统**
  - 注册、查询、执行工具
  - 工具权限控制
  - 工具分类管理
- **Provider 系统**
  - 支持 OpenAI、Anthropic、Google 等 LLM Provider
  - Provider 配置管理
  - 统一请求接口
- **模板系统**
  - 4 个预定义 Agent 模板（Chat、Code、Data、Writing）
  - 模板分类管理
  - 快速创建 Agent
- **4 个预定义模板**
  - 💬 Chat Assistant（聊天助手）
  - 💻 Code Assistant（代码助手）
  - 📊 Data Analyst（数据分析助手）
  - ✍️ Content Writer（内容写作助手）

### 📚 Documentation
- 完整的 API 文档
- 使用示例
- 自定义 Agent 开发指南

### 🔧 Technical Details
- 新增 `packages/core/src/agent/` 目录
- 核心类：AgentBase、AgentManagerImpl、ToolSystemImpl、ProviderSystemImpl、AgentTemplateManagerImpl
- 完整的类型定义系统

### 🧪 Testing
- 所有示例通过测试
- 类型检查通过
- 核心功能验证

---

## [0.0.7] — 2026-08-04 🐱

### ✨ Features
- i18n localization fully wired into the CLI (help text, config, serve output)
- Friendly bilingual `spak` intro banner
- Colorized `spak -v` version output
- Embedded `spm` (Spak Package Manager) project built alongside spak

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
