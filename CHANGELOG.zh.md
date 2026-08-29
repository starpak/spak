# Spak 变更日志喵～ ✨

> 咱记录下每次长大的足迹的说！(｡>ω<｡)

---

## [Unreleased]

### 🚀 构建器 2.0 —— 封闭二进制
- **`spm build -i <软件> -n <name> -v <version>`**：产出自包含单文件二进制（Node SEA）——框架运行时（core/loader/apps/i18n/cli）+ 内嵌 APP 入口全部打入，运行免 Node；入口支持文件或目录（目录默认读 `spak.manifest.json` 的 `master`）。
- **`spm dev`**：开发模式——默认 watch + HMR 热重启（轮询实现，抗 inotify 事件风暴）；`--no-hmr` 每次变更完整 SEA 重建并重启真二进制（构建期仿真）。
- **废弃 .pak 应用包体系**：`pack`/`list`/`info`/`install`/`uninstall`/`publish` 移除；审查/权限职责上移（构建期校验后内嵌）。
- **SEA 运行时适配**：内嵌翻译（语言前缀兼容 `en-US → en`）、沙箱子进程自 re-exec（`--spak-sandbox`）、版本旗冲突解决（子命令 `-v` 是业务选项不被全局拦截）、`__dirname`/`__filename` 安全占位。
- **Monorepo 回退解析**：`APPS/` 下用户代码的 `@spakjs/*` 引用统一归位到 `packages/<name>/lib` 产物。
- **`packages/apps`**：`hmr.ts` 的 `createRequire` 改为防御式（适配 bundle/SEA 中不存在 `require.resolve` 的环境）。
- **样例应用 `APPS/hello`**：manifest 驱动入口 + 直接 `import '@spakjs/apps'` 验证框架能力内嵌。

### ✨ 新功能
- **CPC 安全补强**：
  - **manifest permissions 声明**：可执行应用必须在 `spak.app.json` 明示 `network`/`fs`/`childProcess` 权限，缺失或非法即被 `spm install` 安全审查者拒收（缺省最小权限、fail-closed）；`spm info` 会展示声明的权限。
  - **真实网络防火墙**：net/tls 层 `allow`/`deny` 规则（默认 `allow: localhost` + `deny: external`），失败默认拒绝；CPC 启动时装默认规则，沙箱经 `SPAK_FIREWALL_RULES` 环境变量继承（错误码 `ECFWACCESS` / `CFW-DENY`）。
  - **沙箱加固**：真装载插件入口（package.json `main` → `spak.manifest.json` master → `require.resolve`）、每 worker 独立 V8 内存帽（`NODE_OPTIONS --max-old-space-size`）、RSS 自检超限上报 `overbudget` → 父进程开熔断并终止沙箱（已实测触发）。
  - **输出全 i18n**：用户可见 CLI 输出全部走 locales（143 key 中英对称）；包级翻译拆分为 `packages/*/src/locales`（权威源仍为根 `locales/`）。

### 🐛 修复
- **`spm i18n init` 命令**：遍历所有包源码提取 `T()`/`t()` 的 i18n key，将未收录进 `locales/{zh,en-US}.yml` 的 key 以「仅 key、空内容」形式追加补全（幂等、不破坏原有内容）。

### 🐛 修复
- **编译错误全面修复**：`@spakjs/util` 的 `defineEnumProperty`（TS7053）、`@spakjs/core` schema 的 symbol 索引访问、`@spakjs/loader` 的 shared 类型（EffectScope/ForkScope、`ensureScopeRecord` 等），`pnpm build` 全量通过。
- **命令解析器修复**：`h.parse()` 返回 Fragment（children 是普通字符串）而非 koishi 风格的 text 元素数组，导致文本节点被当元素、空白被转义、整串退化成一个 token；现已正确识别字符串文本节点，并新增 `img` 领域以匹配既有测试。
- **测试套件修复**：移除依赖已废弃子系统（koishi 分层 API / satori / 内存数据库）的死测试；`parser.spec.ts` 现 19 项全绿。
- **幽灵引用清理**：删除配置与 CPC 白名单中不存在的 `plugin-server` / `plugin-http` / `plugin-hmr` / `plugin-daemon` 引用；清空 `data/config.json` 旧版 `server` 残留。
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
