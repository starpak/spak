# Spak 喵～ ✨

> 一个基于 Koishi 的多文件服务项目框架的说！

> **框架版本**: v0.0.7
> **English**: [README.md](README.md)

---

## 呜喵～这是什么呀？(=ↀωↀ=)

**Spak** 是一个基于 [Koishi](https://koishi.chat/) 的**多文件服务项目框架**喵！它帮你把插件应用组织得井井有条，内置了配置管理、国际化、CLI 工具、服务编排，以及独立的日志系统的说！

咱用的是 **TypeScript** + **pnpm monorepo** 架构喵～

---

## 包包列表

| 包包名 | 是干什么的喵～ |
|--------|--------------|
| `@spakjs/core` 🧠 | 大脑核心的说！命令、中间件、i18n、权限、Schema、会话管理都在这里～ |
| `@spakjs/cli` 🎮 | CLI 入口喵！`spak serve`、`spak config`、`spak cpc`、`spak status`。所有输出都是彩色、人性化的哦！ |
| `@spakjs/loader` 📂 | 配置加载器，支持 YAML/JSON，处理 env 文件和插件生命周期 |
| `@spakjs/config` ⚙️ | 配置管理器，存储到 `~/.spak/config.json` |
| `@spakjs/i18n` 🌐 | 一体化国际化工具：Locale 树、回退算法、yml 翻译加载器、`T()` 助手函数 |
| `@spakjs/log` 📝 | **独立日志模块**喵！多传输通道（控制台/文件/流）、日志级别、结构化日志，还内置了 Cordis Logger 桥接哦～ |
| `@spakjs/message` 💬 | 消息和元素工具库 |
| `@spakjs/util` 🧰 | 工具箱：命令声明、对象监听、字符串插值、各种小工具 |

## 插件们

| 插件名 | 说明 |
|--------|------|
| `@spakjs/plugin-server` 🖥️ | 服务器服务和路由（HTTP/Socket） |
| `@spakjs/plugin-http` 🌐 | HTTP 和 WebSocket 客户端 |
| `@spakjs/plugin-hmr` 🔥 | 热模块替换，开发用喵 |
| `@spakjs/plugin-daemon` 👻 | 后台守护进程 — 日志写入文件，脱离终端运行 |

---

## i18n — 多语言支持 🌐

Spak 内置了**手写**的翻译喵！：

| 语言 | 配置值 |
|------|--------|
| 🇬🇧 English | `en` |
| 🇨🇳 简体中文 | `zh` |

切换语言方法：
```bash
spak config set language zh   # 切换成中文
spak config set language en   # 切回英文
```

---

## 快速开始喵！(>ω<)ノ

### 需要准备

- Node.js >= 18
- pnpm >= 10

### 安装

```bash
pnpm install

# 构建所有包包
pnpm build
```

### 配置文件

创建 **spak.config.yml**：

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

### 启动！(=ↀωↀ=)✧

```bash
# 启动应用（彩色、人性化的日志输出哦！）
spak serve

# 或者指定配置文件
spak serve ./spak.config.yml

# 查看运行状态
spak serve status

# 停止正在运行的实例
spak serve --stop
```

### CLI 命令

```bash
# 配置管理
spak config get <键名>
spak config set <键名> <值>
spak config list

# 插件安全检查（CPC）
spak cpc check
spak cpc status
spak cpc sandbox <插件名>
spak cpc circuit <插件名>
```

---

## 项目结构

```
spak/
├── packages/        # 核心包喵！
│   ├── core/        # 框架核心（命令、i18n、中间件...）
│   ├── spak-cli/    # CLI 入口（serve、config、cpc 命令）
│   ├── loader/      # 配置 + 插件加载器
│   ├── config/      # 配置管理器
│   ├── i18n/        # 翻译引擎 + LocaleTree
│   ├── log/         # 🆕 独立多通道日志模块
│   ├── message/     # 消息元素工具
│   └── util/        # 工具库
├── plugins/         # 插件们喵～
│   ├── server/      # HTTP/Socket 服务器
│   ├── http/        # HTTP/WebSocket 客户端
│   ├── hmr/         # 热模块替换
│   └── daemon/      # 后台守护进程 + 日志路由
└── spak.config.yml
```

---

## 许可证

MIT License. Copyright © Spak Team

欢迎任何形式的贡献——bug 反馈、功能建议、代码贡献都欢迎喵～(>ω<)ﾉ☆
