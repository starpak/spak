# Spak Changelog ✨

> Every step of growth is recorded here! (｡>ω<｡)

> **中文版**: [CHANGELOG.zh.md](CHANGELOG.zh.md)

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
