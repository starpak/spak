# 欢迎贡献 Spak 喵～ ✨

> 呜喵～感谢主人愿意给 Spak 添砖加瓦的说！(>ω<)ﾉ☆

---

## 🐱 咱怎么开始呀？

### 1. 先和咱熟悉熟悉～

Spak 是一个 **pnpm monorepo** 结构的 TypeScript 项目喵！先确保你的环境准备好了的说：

- **Node.js** >= 18
- **pnpm** >= 10

```bash
# 克隆仓库
git clone https://github.com/YOUR-ORG/spak.git
cd spak

# 安装依赖
pnpm install

# 编译项目
pnpm build
```

### 2. 找个想做的事情喵～

咱的建议：

- 🐛 修 **Bug** — 在 Issues 里找带 `bug` 标签的任务～
- ✨ 加 **新功能** — 看看 `feature request` 标签！
- 📖 写 **文档** — README 呀、API 文档什么的都欢迎的说！
- 🧪 加 **测试** — 覆盖率越高咱越安心的说喵～

### 3. 开始干活喵！

```bash
# 创建一个新分支
git checkout -b feat/your-feature-name
# 或者
git checkout -b fix/your-bug-fix
```

## 📂 项目结构

```
spak/
├── packages/        # 核心包喵！
│   ├── core/        # 🧠 大脑核心
│   ├── spak-cli/    # 🎮 CLI 小帮手
│   ├── loader/      # 📂 配置加载器
│   ├── config/      # ⚙️ 配置管理器
│   ├── language/    # 🌐 语言国际化
│   ├── usefor/      # 🧰 工具箱
│   ├── ccmd/        # ⌨️ 配置命令
│   ├── cpc/         # 🔒 安全检查
│   └── i18n-utils/  # 🌍 国际化工具
├── plugins/         # 插件们喵～
│   ├── server/      # 🖥️ 服务器服务
│   ├── http/        # 🌐 HTTP 相关
│   ├── hmr/         # 🔥 热更新
│   └── daemon/      # 👻 后台守护
└── spak.config.yml  # Spak 配置文件
```

## ✍️ 代码规范

- **TypeScript** — 能写 TypeScript 就不要写 JavaScript 的说！
- **ESLint** — 咱会用 ESLint 检查代码，提交前记得跑一下喵
- **命名规范**：
  - 变量/函数：`camelCase`
  - 类/接口：`PascalCase`
  - 文件/目录：`kebab-case`
- **提交信息** — 咱推荐用 [Conventional Commits](https://www.conventionalcommits.org/) 风格的说：

```
feat: 添加了超厉害的新功能喵～
fix: 修好了那个烦人的小虫虫
docs: 更新了 README 文档
chore: 整理了依赖什么的
```

## 🧪 测试

```bash
# 跑所有测试
pnpm test

# 跑某个包的测试
pnpm --filter @spakjs/core test
```

## 🚀 提交 Pull Request

1. 确保你的分支是最新的 `main`
2. 跑一遍测试确保全部通过
3. 提交 PR 时用咱提供的模板填写信息喵～
4. 等待维护者审查（咱会尽快看的主人大丈夫！）

## 💬 沟通

- **Issues** — 反馈 Bug 或提需求，记得用咱的模板喵
- **Discussions** — 想聊天或者问问题就来这里说～

---

> 呜喵～再次感谢主人愿意为 Spak 做贡献！(っ´ω`)ﾉ✨
> 有什么不懂的尽管问咱，run小月随时待命的说！
