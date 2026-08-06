# Spak 变更日志喵～ ✨

> 咱记录下每次长大的足迹的说！(｡>ω<｡)

---

## [0.0.7] — 2026-08-04 🐱

### ✨ 新功能
- i18n 国际化全面接入 CLI（帮助文本、配置、serve 输出）
- 友好双语 `spak` 介绍横幅
- `spak -v` 彩色版本号输出
- 内嵌 `spm`（Spak 专属包管理器）项目随 spak 一同编译
- `.pak` 单文件应用包格式（类 APK）+ `spm pack` 命令
- server 从 `~/.spak/.apps` 加载 `.pak` 应用

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
