# Spak 变更日志喵～ ✨

> 咱记录下每次长大的足迹的说！(｡>ω<｡)

---

## [Unreleased]

### 🐛 修复
- **编译错误全面修复**：`@spakjs/util` 的 `defineEnumProperty`（TS7053）、`@spakjs/core` schema 的 symbol 索引访问、`@spakjs/loader` 的 shared 类型（EffectScope/ForkScope、`ensureScopeRecord` 等），`pnpm build` 全量通过。
- **命令解析器修复**：`h.parse()` 返回 Fragment（children 是普通字符串）而非 koishi 风格的 text 元素数组，导致文本节点被当元素、空白被转义、整串退化成一个 token；现已正确识别字符串文本节点，并新增 `img` 领域以匹配既有测试。
- **测试套件修复**：移除依赖已废弃子系统（koishi 分层 API / satori / 内存数据库）的死测试；`parser.spec.ts` 现 19 项全绿。
- **幽灵引用清理**：删除配置与 CPC 白名单中不存在的 `plugin-server` / `plugin-http` / `plugin-hmr` / `plugin-daemon` 引用；清空 `~/.spak/config.json` 旧版 `server` 残留。
- **i18n 补齐**：zh / en 全集对齐（210 个 key 对称），补充 `spak.cpc.ssetps.firewall_rule_invalid`。
- **构建门禁**：接入 `simple-git-hooks`，`pre-commit` 必跑 `pnpm build && pnpm test`，编译不过一律阻止提交。
- **文档对齐**：README（中/英）移除不存在的插件宣传与过期信息，版本号统一为 v0.1.0。

---

## [0.0.7] — 2026-08-04 🐱

### ✨ 新功能
- i18n 国际化全面接入 CLI（帮助文本、配置、serve 输出）
- 友好双语 `spak` 介绍横幅
- `spak -v` 彩色版本号输出
- 内嵌 `spm`（Spak 专属包管理器）项目随 spak 一同编译

### 🔧 修复
- `bin.js` 权限 / 陈旧链接解析问题
- `build.sh` 用正确的 rootDir 编译 `lib/cli/`
- serve/config/cpc 输出的中文翻译正常渲染
- 移除废弃插件配置残留（`@spakjs/plugin-server` 等）

---

## [0.0.3] — 2026-07-25 🐱

### ✨ 新功能
- 初始化项目基础结构的说！
- 核心包 `@spakjs/core` 搭建完成喵～
- CLI 工具 `@spakjs/cli` 可以跑起来啦！
- 配置加载器 `@spakjs/loader` 支持 YAML/JSON 读取的说
- 工具包 `@spakjs/utils` 装了好多小玩意喵
- 国际化工具 `@spakjs/i18n-utils` 准备就绪～

### 🖥️ 插件
- `@spakjs/plugin-server` 服务器服务插件
- `@spakjs/plugin-http` HTTP 相关插件
- `@spakjs/plugin-hmr` 热更新插件
- `@spakjs/plugin-common` 通用插件合集

### 🏗️ 工程化
- 采用 pnpm monorepo 架构的说
- TypeScript 严格模式配置
- MIT 开源许可证
- 喵娘风格的 README 上线啦！

---

> 呜喵～之前的版本咱还没来得及记录的说～下次一定补上！(*>ω<*)ﾉ
