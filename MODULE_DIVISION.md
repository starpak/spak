# Spak 模块分工条例 （Module Division）

> 解决「core 是核心，但 spak 又是主包，到底谁加载谁？」「为什么 usefor 包里面根本看不懂？」「ccmd/cpc 明明就是 CLI 命令，为啥要独立发一个包？」等一系列职责冲突问题。
>
> v0.1.x 起生效。后续 PR 必须遵守本条例，否则打回。

---

## 0. 一句话消除「core vs spak」冲突

| 名字 | npm 包名 | 真实角色 | 做什么 |
|---|---|---|---|
| **core** | `@spakjs/core` | **纯运行时内核（Logic Core）** | Context / Commander / Processor / I18n 渲染 / Permissions / Schema / Filter / Session —— 不依赖 `fs`、`process`，可跑浏览器。 |
| **spak** | `spak`（就是根 package.json） | **纯运行时身份（Runtime Identity）** | 自己**不实现任何业务逻辑**：v1.0.0 起 CLI 全部移交 `spm`（packages/spm），`bin.js` 仅保留 `spak -v` 版本响应，其余输入引导使用 `spm`。对外 API 仍由 core/i18n/loader 等子包直接提供。 |
| **spm** | `spm`（packages/spm） | **唯一 CLI（Spak Package Manager）** | 包管理：`pack`/`list`/`info`/`install`（带安全审查者）/`uninstall`/`publish`；运行时启停：`serve`/`--stop`/`--restart`/`--kill`/`status`；Config / CPC / i18n 命令（命令实现注入自 `@spakjs/cli`，构建时先编 cli 再编 spm）。 |

→ **没有冲突**。core 是引擎，spak 是运行时身份（v1.0.0），spm 是唯一的驾驶台（CLI），@spakjs/cli 是驾驶台里的仪表盘（命令库）。你可以单独用引擎（`@spakjs/core`），也可以直接用整车（spm + spak）。

---

## 1. 架构总览（依赖方向：右下 → 左上，禁止反向箭头）

```
                     ┌─────────────────────────────────┐
                     │   spak (Facade / 整车入口)       │
                     │   export * + createApp()         │
                     └──────────────┬──────────────────┘
                                    │ re-exports
  ┌──────────────────────┬──────────┴───────────┬───────────────────┐
  │                      │                      │                   │
┌─▼────┐  ┌───────────┐  ┌▼───────┐        ┌──▼──────────┐  ┌──────▼──────┐
│ CLI  │  │  Plugins  │  │ Loader │        │   Config    │  │  I18n       │
│spak  │  │ (optional)│  │ NodeJS │        │  user ~/    │  │ LocaleTree  │
│serve │  │daemon/hmr/│  │ yml/yml│        │  .spak/     │  │ + T()       │
│config│  │server/http│  │ fork/HR│        │  JSON store │  │ yml loader  │
│cpc   │  └───────────┘  └───┬────┘        └──────┬──────┘  └──────┬──────┘
└──┬───┘                      │                     │                │
   │ depends on               │                     │                │
   │                          └──────────┬──────────┘                │
   └────────────────────►    ┌──────────▼──────────┐                │
                            │   @spakjs/core       │                │
                            │ (Context / Commander  │                │
                            │  / Middleware /       │◄───────────────┘
                            │  Permissions / Schema │
                            │  / I18n render core   │
                            │  + Session + Filter  │
                            └──────────┬───────────┘
                                       │ depends on
                     ┌─────────────────┴───────────────────┐
                ┌────▼──────┐                        ┌──────▼─────┐
                │ @spakjs   │                        │ @spakjs    │
                │  /util    │                        │  /message  │
                │ 纯函数库  │                        │ h/Fragment │
                │ coerce,   │                        │ escape,    │
                │ observe,  │                        │ parse,     │
                │ Random,   │                        │ normalize  │
                │ Command   │                        │  (VDOM)    │
                │ Declaration types                 │            │
                └───────────┘                        └────────────┘
                (零副作用，最底层)                 (零副作用)
```

---

## 2. 每个包的分工边界（「该做什么 / 不该做什么」）

### 2.0 `@spakjs/util`（原 usefor，改名原因见 §4）
- **npm**: `@spakjs/util`
- **位置**: `packages/util/`
- **做什么**:
  - 纯函数工具库，零副作用、不依赖其他 @spakjs/* 包。
  - 类别：`misc`（coerce/merge/isInteger/sleep/enumKeys…）、`observe`（响应式代理 observeObject/Array/Map/Set/Date）、`string`（interpolate/escapeRegExp）、`command`（CommandDeclaration/Arg/Option 类型声明）。
  - 随机数 `Random`（来自 inaba）、`cosmokit` 的全部二次导出（方便用户一行 import 到所有工具）。
- **不该做**:
  - ❌ 读写文件、起进程、访问 process.env。
  - ❌ 依赖其他 @spakjs/* 包（除 cosmokit/inaba 这类第三方纯工具）。
  - ❌ 实现任何与 Spak 运行时强相关的逻辑（比如 Context 扩展、命令执行）。
- **命名**: **util = utility**，明确，不再用含义不明的 "usefor"。

### 2.1 `@spakjs/message`（从 core 拆出，新增）
- **npm**: `@spakjs/message`
- **位置**: `packages/message/`
- **做什么**:
  - `h()` 超文本构造器、`Fragment` 消息片段、`escape/unescape` XML 实体、`h.parse` XML-like 字符串解析、`h.normalize` 扁平归一化。
  - 纯逻辑，可在浏览器里跑（不需要 core，不需要 fs）。
- **为什么独立**：CLI / 插件工具链 只需要 "把一段字符串转义一下"、"把 `<at id="1">` 解析出来" 这类操作，以前必须拖整个 `@spakjs/core`（带 cordis、Schema、I18n 一堆大依赖）进来。拆分后体积下降 80%+。
- **不该做**: ❌ 引入 core、❌ 引入 cordis 类型（satorijs 的 declare module 除外）。

### 2.2 `@spakjs/core`（纯内核，名字正确，保留）
- **npm**: `@spakjs/core`
- **位置**: `packages/core/`
- **做什么**:
  - Context 生命周期（继承 cordis，通过 `context.ts` 再导出）
  - Commander 命令系统（`command/*`：声明 + Parser + validate）
  - Processor 中间件（`middleware.ts`）
  - I18n **渲染核心**（`i18n.ts`：`_render` / `render` / `compare` / `find` / Locale loaders）——**注意：这里只是渲染引擎；翻译文件加载和 T() 简写在 I18n 包**
  - Permissions 权限（`permission.ts`）
  - Schema Service （`schema.ts`）
  - Filter 会话过滤器（`filter.ts`）
  - Session 会话执行（`session.ts`）
  - 为了向下兼容，重新 `export *` util 和 message 的 API（所以 `from '@spakjs/core'` 也能拿到 `h / coerce / Random`）。
- **不该做**:
  - ❌ 出现 `import 'fs'` / `import 'path'` / `import 'os'` / 任何 require 子进程（**除了 `core/src/i18n.ts` 里读 locales YAML 的兼容加载，这部分以后也要搬到 I18n 包**）。
  - ❌ 出现「脚手架」行为（写 package.json、mkdir locales 目录）。
  - ❌ 包含任何 CLI 命令的 action 实现。
  - ❌ 名称叫 core 就以为能往里面塞所有东西——"消息 VDOM"已经拆出去 message 了。

### 2.3 `@spakjs/i18n`（合并 i18n-utils + locales，新增）
- **npm**: `@spakjs/i18n`
- **位置**: `packages/i18n/`
- **做什么**:
  - `LocaleTree.from()` + `fallback()`（原 i18n-utils）：语言回退树算法。
  - `loadYmlTranslation(lang)`：扫描 `packages/*/locales/*.yml` + `plugins/*/locales/*.yml` 合并翻译。
  - `init(i18n_instance)` + `t(key, params?)` + 别名 `T()`：供没有 Context 上下文的 CLI 工具/脚本直接翻译。
  - `setLanguage(lang)` / `getCurrentLanguage()`：走 Config 包持久化。
- **为什么合并**：原 `@spakjs/i18n-utils` 依赖 `@spakjs/locales` 写在 package.json 但源码里不 import，两个包加起来才 200 行，语义完全重叠，拆分造成 "找 T() 不知道在哪个包里" 的混乱。合并后就一包：**i18n 相关全在这里**。
- **不该做**: ❌ 自己实现命令解析、❌ 访问 loader cache。

### 2.4 `@spakjs/config`（保留，但角色精简）
- **npm**: `@spakjs/config`
- **位置**: `packages/config/`
- **做什么**:
  - **用户级**（工作目录无关）配置管理：`~/.spak/config.json`（= CONFIG_DIR + CONFIG_FILE）。
  - API: `loadConfig()` / `saveConfig()` / `getConfig(key)` / `setConfig(key, value)` / `CONFIG_DIR` / `CONFIG_FILE`。
- **不该做**:
  - ❌ 不再自带 config CLI 命令（已搬入 spak-cli → `commands/config.ts`）。
  - ❌ 不读写项目级 spak.config.yml（这是 Loader 的职责）。
- **角色一句话**：`spak config set language zh` 这种「换个机器也要保持」的设置归它；`plugins:`、`$if:` 这种项目内的配置 Loader 管。

### 2.5 `@spakjs/loader`（保留，名字正确）
- **npm**: `@spakjs/loader`
- **位置**: `packages/loader/`
- **做什么**:
  - 读项目根的 `spak.config.*` / `spak.yml` / CWD 配置（shared.ts 抽象类）。
  - 做变量插值（`\${{ env.XXX }}`、`\${{ pkg.version }}`）。
  - 做 `$if` 条件加载（修好了：`true/false` / 字面量 / interpolate 后的真假都能正确判）。
  - 插件 fork/reload、通过 `ns-require` 解析插件路径。
  - 写配置文件回磁盘（`writeConfig`）。
  - NodeLoader 子类（index.ts）：dotenv、full reload（通过 IPC，非 IPC 场景安全降级为直接 `process.exit`）。
- **不该做**: ❌ 实现命令行解析、❌ 提供 T() 翻译 API（用 I18n 包）。

### 2.6 `@spakjs/cli`（命令库，构建时注入 spm）
- **npm**: `@spakjs/cli`
- **位置**: `packages/cli/`
- **做什么**:
  - **命令实现库**（不是可执行入口）：所有命令 declarations 存放在 `cli/src/commands/*.ts` 与 `cli/src/cli/*.ts`，由 `spm`（packages/spm）在构建时注入并统一注册。
    - `commands/config.ts`：`config get/set/list`（原 `@spakjs/ccmd`）。
    - `commands/cpc.ts`：`cpc check/sandbox/ssetps/circuit/status` + `test`（原 `@spakjs/cpc`）。
    - `cli/start.ts`：`serve/status/stop/restart/kill/init-locales`。
  - `cli/registry.ts`：扁平化命令路由 + 自定义 subcommand help 生成（cac 对二级子命令支持弱，手动实现路由 + l10n）。
  - `cli/types.ts`：重导出 util 里的 CommandDeclaration 类型。
- **不该做**: ❌ 直接作为可执行 CLI 被调用（入口在 spm）、❌ 把命令拆成独立 package（ccmd/cpc 已删除）。

### 2.7 `spm`（唯一 CLI，本次新立）
- **npm**: `spm`
- **位置**: `packages/spm/`
- **做什么**:
  1. **包管理**：`spm pack <appDir>`（打包 .pak）、`spm list`、`spm info <name>`（含权限声明展示）、`spm install <name|--file>`（内置**安全审查者**：防 zip-slip、可执行内容需 manifest 声明 exec/desktop + **permissions 权限声明校验**，缺失/非法即拒绝）、`spm uninstall <name>`、`spm publish --file <pak>`（本地 registry ~/.spak/.registry）。
  2. **运行时启停**：`spm serve [--stop/--restart/--kill]`、`spm serve status`（pid 文件 ~/.spak/.pid？见 cli/start.ts）。
  3. **注入命令**：构建时把 `@spakjs/cli` 的 serve/config/cpc/i18n declarations 注册进 cac（bin: `lib/index.js`）。
- **依赖**: `@spakjs/cli` / `@spakjs/i18n` / `@spakjs/util` / `@spakjs/log` / `@spakjs/apps`（workspace，供权限校验类型）。

### 2.8 Plugins（`plugins/*`，保留，4 个）
每个插件都是可选的，只在用户 `spak.config.yml` 里显式声明 `plugins: { "@spakjs/plugin-xxx": ... }` 才加载。

| 包 | 职责 | Node-only？ |
|---|---|---|
| `@spakjs/plugin-daemon` | PID 文件写入、stdout/stderr 捕获追加到 `.daemon.log`、spawn 子进程式守护进程 | ✅ |
| `@spakjs/plugin-hmr` | 基于 chokidar + require.cache（通过 createRequire 统一上下文）的插件热重载 | ✅ |
| `@spakjs/plugin-server` | re-export `@cordisjs/plugin-server`（提供 HTTP 服务能力） | ❌ |
| `@spakjs/plugin-http` | re-export `@cordisjs/plugin-http`（提供 HTTP 客户端、fetch 统一） | ❌ |

**禁止 Plugins**: ❌ 再 import `koishi`，必须统一 `from '@spakjs/core'`（hmr/daemon 已修）。❌ 再 require.resolve `@koishijs/*`（hmr 已修 → `@spakjs/*`）。

### 2.8 `spak`（根主包 / 纯运行时身份，v1.0.0 修正）
- **npm**: `spak`（就是根）
- **位置**: `/`（package.json + bin.js）
- **做什么**:
  1. `bin.js` 仅保留运行时身份：`spak -v` 打印版本；其余输入一律引导用户使用 `spm`（CLI 已整体移交）。
  2. 对外 API 由子包直接提供（`@spakjs/core` / `i18n` / `loader` 等），无需根层 re-export 门面（商业版起点即务实的单一路径）。
  3. 声明 workspaces: `packages/*`，作为 pnpm monorepo 根。
- **不该做**:
  - ❌ 实现任何命令（那是 spm 的职责）。
  - ❌ user code 出现 `import { ... } from 'spak/packages/core/src/...'` 这种跨内部路径的用法（用 `exports` 字段封闭）。

### 2.9 `@spakjs/log`（新增，Node 能力层）
- **npm**: `@spakjs/log`
- **位置**: `packages/log/`
- **做什么**:
  - 多 transport 结构化日志：`ConsoleTransport`（染色，error/warn 走 stderr）、`FileTransport`（追加写 + 按 `maxSize` 时间戳轮转）、`StreamTransport`（任意 `write(str)` 对象）。
  - `createLogger(scope)` 工厂 + `Logger` 类（`.error/.warn/.info/.debug/.trace`），`configureLogger({ level, transports, formatter })` 全局配置，`getLoggerConfig()` 读取。
  - `attachCordis({ Logger })` 桥接 cordis Logger：把 core/loader/daemon 里既有 `new Logger('x')` 的输出转发进本包 transport 链（best-effort，基于 cordis `Logger.targets` 的 `{ colors, print }` 契约做特性检测，契约不符则安全 no-op）。
  - 内置 `defaultFormatter`（纯文本）/ `colorFormatter`（ANSI），支持自定义 `Formatter`。
  - **零第三方依赖**——任何项目（不必是 spak 用户）都能独立安装使用。
- **为什么独立**：cordis 自带 Logger 只有 console 单 transport、无文件/轮转/统一格式化。本包补齐 transport 抽象与配置层，且通过 `attachCordis` 让既有 cordis 日志零改动汇流，而非重复造 scope/level。
- **不该做**:
  - ❌ 依赖 `@spakjs/core`（避免循环：core 已用 cordis Logger，若 core 反过来依赖 log 会绕）。
  - ❌ 出现在浏览器 bundle 里（file transport 用 `fs`，是 Node-only 包，与 loader/config 同层）。
  - ❌ 把 cordis Logger 整个重新实现——只做 transport 扩展与桥接。
- **facade 别名**：spak 主包里以 `SpakLogger` 暴露本包的 `Logger` 类（因 `export *` 会与 core 的 cordis `Logger` 撞名被静默吞掉），优先用 `createLogger()` 工厂。用法见 [docs/logging.md](file:///workspace/docs/logging.md)。

---

## 3. 依赖方向 6 条铁律

1. **核心不反向依赖门面**：`@spakjs/*` 任何包不得 `import 'spak'`（根），永远是 spak import 它们。
2. **util/message 是最底层**：不得 import 任何其他 @spakjs/* 包。如果工具需要 "根据上下文决定"，那它不是 util，放到对应上层包里。
3. **core 不碰 Node IO**：core 的 `fs`/`path`/`child_process` 引用数必须保持 ≤ i18n loader 一处（未来要搬迁到 I18n 包）。**Node 能力层**（`@spakjs/log` / `config` / `i18n` / `loader`）允许使用 `fs` 等 Node IO，但仍不得反向依赖 core——它们是 core 的「下层供给」，不是 core 的「上层应用」。
4. **CLI 命令不分包**：以后任何 `spak xxx` 子命令都直接写 `packages/spak-cli/src/commands/xxx.ts`，不再新建独立 `@spakjs/xcmd` 包（§4 有具体理由）。
5. **Plugins 只能依赖 core / loader / i18n / util / message / log**，不得交叉依赖（plugin-a → plugin-b），不得依赖 CLI。
6. **Config 纯静态读写**：不得依赖 loader（避免循环），需要用哪个 config 的地方直接 import。

---

## 4. 本次重构决策记录（为什么这么拆）

### 4.1 `@spakjs/usefor` → `@spakjs/util`（改名）
- 动机：名字 "usefor" 字面语义=「用在谁身上？」，完全不表达内容。新人看 package.json 一脸懵。
- 改名 `util` 是 JS/TS 生态惯例（Node.js util module、lodash 也是 util），一看就懂。
- 所有内部 import / package.json dependencies 已同步更新。

### 4.2 core/element.ts → @spakjs/message（拆分）
- 动机：core 里 VDOM 相关代码独立存在，且 CLI/插件工具链只需要 h()/escape/parse，却被迫拖入 cordis + cosmokit + fastest-levenshtein + js-yaml + cordis。
- 拆分后 @spakjs/message 体积 ~ 8KB（未压缩），可被任何微工具 import。core 向后兼容通过 re-export。

### 4.3 i18n-utils + locales → @spakjs/i18n（合并）
- 动机：两个包一个叫 "utilities" 一个叫 "翻译系统"，但实际各自只暴露了 1-2 个 API；且 i18n-utils 的 package.json 里写了对 locales 的依赖但源码里完全不 import。对使用者来说 "我要翻译该 import 哪个？" 很混乱。
- 合并后 API 列表：`LocaleTree` / `fallback` / `loadYmlTranslation` / `init` / `t` / `T` / `setLanguage` / `getCurrentLanguage` + default export object，一目了然。

### 4.4 删除 @spakjs/ccmd + @spakjs/cpc → spak-cli/src/commands/*（不分小包）
- 动机：
  - **ccmd**（"Config CLI commands"）只有 69 行、cpc 393 行。npm 包就该是"可独立分发、可被别人用"的东西，但这两个包**没有任何除了 spak-cli 之外的消费者**，完全是内部模块化。为它们多发一个包：
    - 增加 pnpm-lock.yaml 体积、安装时间、发布流程。
    - 用户 npm audit 时会多出现 2 个包要升级。
    - 新人想加一个新子命令要「mkdir 新包→写 package.json→加依赖→import→ publish」一套流程，门槛太高。
  - 业界对比：`@vue/cli` 所有命令在一个包里、`create-react-app` 所有命令在一个包里、`vite` 所有命令在一个包里。
- 合并策略：保留各自 declarations 原样搬迁到 `packages/spak-cli/src/commands/config.ts` 和 `cpc.ts`，import 路径改成本地相对路径，删除两个独立包目录。

### 4.5 删除 `serve` 启动时的 `injectLanguageDeps`（C6）
- 原行为：每次 `spak serve` 启动都扫描 `packages/*/package.json`，默默写入 `"@spakjs/locales": "*"`，并创建空 locales 目录。
- 问题：这是脚手架行为，运行时不应该修改源码，会弄脏 git；而且版本号用 `*` 完全不 lock。
- 新行为：把它抽成独立的 `spak init-locales` 命令，只有用户显式调用才执行（就像 `tsc --init`、`eslint --init`）。

---

## 5. 想新增包？Checklist（先打勾再动手）

想开一个新的 `@spakjs/your-idea` 包？先全部打勾：

- [ ] **它能单独被第三方项目拿来用吗？**（否则写进 spak-cli/src/commands/* 或对应现有包的 src 里，不发新包）
- [ ] **它和 6 条依赖方向不冲突**（如：不反向依赖 spak 主包、不把 Node fs 放进 core/message/util）
- [ ] **已有包里没有重叠职责**——比如 "想加个命令" 不叫新包，叫「加 commands/xxx.ts 文件」
- [ ] **package.json name: @spakjs/<名词或动宾>**（用英文/缩写；不要用 usefor/cpc 这种只有内部人懂的暗语）
- [ ] **main/typings/tsconfig.json** 对齐现有包模板（拷贝 packages/util 的）
- [ ] **根 package.json dependencies 里加上 `workspace:^`**，再到 spak `src/index.ts` 里 `export *`（如果它是公共 API）

打勾数 < 5 → 退回；= 5 → 去写代码 + 给本条例 PR 更新 §2 的表格。

---

## 6. 现有包清单一览（v0.1 起）

```
spak (根 / Facade)               → src/index.ts + package.json
├── @spakjs/util                  → packages/util/       (原 usefor)
├── @spakjs/message               → packages/message/    (原 core/src/element.ts 拆出)
├── @spakjs/core                  → packages/core/
├── @spakjs/i18n                  → packages/i18n/       (i18n-utils + locales 合并)
├── @spakjs/config                → packages/config/
├── @spakjs/loader                → packages/loader/
├── @spakjs/log                   → packages/log/       (多 transport logger，Node 能力层，零第三方依赖)
├── @spakjs/cli  (spak-cli)       → packages/spak-cli/  (内含 commands/config.ts, commands/cpc.ts, cli/start.ts)
│
└── plugins/
    ├── @spakjs/plugin-daemon
    ├── @spakjs/plugin-hmr
    ├── @spakjs/plugin-server     (re-export cordis)
    └── @spakjs/plugin-http       (re-export cordis)
```

---

## 7. 修复摘要（§0–§6 对应的代码审查 Critical/Major 全部修复清单）

代码审查报告里列的 C1–C6 + M1–M11 已在本次重构中顺手修完，对应修改位置：

| # | 问题 | 修复点 |
|---|---|---|
| C1 | spak-cli/browser.mjs 导错 `@koishijs/core` | [browser.mjs](file:///workspace/packages/spak-cli/browser.mjs) → `@spakjs/core` |
| C2 | usefor 的 cosmokit/inaba 错放 devDeps | [util/package.json](file:///workspace/packages/util/package.json) → dependencies |
| C3 | HMR 依赖不存在的 @koishijs/loader/koishi | [hmr/src/index.ts](file:///workspace/plugins/hmr/src/index.ts) → `@spakjs/*` |
| C4 | HMR ESM import 与 CJS require 混用 | HMR 统一用 `createRequire(require.resolve('@spakjs/loader/package.json'))` 做 require cache 上下文 + 判空 |
| C5 | loader `$if` 条件永远判假 | [loader/src/shared.ts isTruthyLike](file:///workspace/packages/loader/src/shared.ts#L316-L335) 重写：支持 boolean/number/字面量 true/false/interpolation 结果 |
| C6 | serve 启动时写 packages/*/package.json | [start.ts](file:///workspace/packages/spak-cli/src/cli/start.ts) 移除默认调用 → 新增独立命令 `init-locales` |
| M1 | build.sh/bat 读不存在的 lib/config.json → 改读 package.json | [run/build.sh](file:///workspace/run/build.sh#L20) + [build.bat](file:///workspace/run/build.bat#L10) |
| M2 | daemon/hmr import koishi → @spakjs/core | 两处 package.json + 源码已同步 |
| M3 | h.parse parseInt NaN → fromCodePoint 崩溃 | Number.isFinite + ≥0 校验，无效实体回退 '�' |
| M4 | locales loadYmlTranslation zh→zh-CN 找不到 | 从固定 en-US/en-GB 候选改为遍历 locales 目录下现存文件 + 前缀匹配 |
| M5 | i18n.compare 空 expect 除零 | [i18n.ts](file:///workspace/packages/core/src/i18n.ts#L111-L116) 判空 |
| M7 | loader 报错提示搜索路径与实际不一致 | [shared.ts L229](file:///workspace/packages/loader/src/shared.ts#L229) 统一为 spak-cli 真实搜索路径 |
| M8 | fullReload 在非 IPC 进程 process.send=undefined 崩 | [index.ts L88-L95](file:///workspace/packages/loader/src/index.ts#L88-L95) typeof 判断后安全降级直接 exit |
| M9 | pnpm-lock.yaml 被 gitignore | [.gitignore#L4](file:///workspace/.gitignore#L4) 移除 pnpm-lock.yaml |
