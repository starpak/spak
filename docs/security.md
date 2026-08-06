# Security — CPC (Check Plug-in Collection)

CPC 是 Spak 仓库内**唯一**负责插件安全措施的模块，位于
[packages/spak-cli/src/commands/cpc.ts](../packages/spak-cli/src/commands/cpc.ts)。
通过 `spak cpc <subcommand>` 调用，需在 `spak.config.yml` 里 `cpc.enabled: true` 才可用。

## 能力清单

| 能力 | 命令 | 状态 | 说明 |
|---|---|---|---|
| **Plugin Check** | `spak cpc check` | ✅ 可用 | 校验内置包（`packages/*`）目录结构与 `package.json`；校验外部插件目录、`main` 入口存在性、依赖完整性（缺失的 `node_modules` 会被标红） |
| **Sandbox 隔离** | `spak cpc sandbox <name>` | ⚠️ 部分 | `spawn` 一个 detached 子进程隔离插件，支持 `sandbox stop <name>` 终止。**注意**：当前子进程里只跑了一段占位脚本（`[sandbox] Plugin X started`），并**没有真正加载并运行目标插件代码**——隔离壳已就位，加载逻辑待补 |
| **SSetPS** | `spak cpc ssetps` | ✅ 可用 | Safety Set Protection System：每 10s 采样 `process.memoryUsage().rss`，超过 512MB 上限的 80% 即告警，并尝试 `global.gc()` 主动回收 |
| **Circuit Breaker** | `spak cpc circuit <name>` / `circuit restore <name>` | ⚠️ 部分 | 维护一个 `Map<string, boolean>` 熔断状态表，可触发/恢复。**注意**：目前**没有任何运行时路径读取这个表去拦截插件**，熔断只是「记录状态 + 打印」，未接入实际隔离 |
| **Firewall** | （内部 `applyFirewallRule`） | ⚠️ Stub | 仅 `console.log` 一条规则文本，**没有真实 allow/deny 网络拦截实现** |
| **Process Isolation** | （配置标志 `processIsolation.enabled`） | ⚠️ 标志位 | 启动时打印一行 ✓，实际隔离仍依赖 sandbox 子命令 |
| **Status** | `spak cpc status` | ✅ 可用 | 展示当前 sandbox 数、熔断数、SSetPS 状态、RSS 占用 |
| **Test** | `spak test` / `spak cpc test serve` | ✅ 可用 | 跑一次 plugin check；`test serve` 额外设 `DEBUG=*`、`SPAK_LOG_LEVEL=3` 并起一个测试服务占位 |

## 已知缺陷与后续工作

以下为代码审查中发现的、**尚未实现完整**的安全项，使用者需知悉：

1. **Sandbox 未真加载插件** —— `isolatePlugin` 的子进程脚本是占位 `setInterval`，
   真正的「在隔离子进程里 require 插件并约束其能力」尚未实现。
2. **Circuit Breaker 是孤儿状态** —— 写入 `circuitBreakers` Map 后无人消费，
   不会真正阻止被熔断的插件运行。需要接入 loader 的插件加载路径或中间件层。
3. **Firewall 是纯打印** —— `applyFirewallRule('default: allow localhost, deny external')`
   不会限制任何网络访问。要做真防火墙，需结合 `@cordisjs/plugin-http` 的拦截器或
   Node 的 `net` 层。
4. **SSetPS 内存阈值硬编码 512MB** —— 不可配置，且 `global.gc()` 仅在
   `--expose-gc` 启动时可用，否则 `global.gc` 为 undefined 静默跳过。
5. **Plugin Check 只看文件存在** —— 不校验插件代码本身的安全性（如是否调用
   `eval`、是否访问 `process.env` 敏感键），仅做结构完整性检查。

## 与日志的协作

`spak cpc test serve` 会设置 `SPAK_LOG_LEVEL=3` 环境变量。未来 `@spakjs/log`
可读取该变量作为默认 `LogLevel`（当前尚未接入，是计划项）。

daemon 模式下 CPC 的 `console.log` 输出由 daemon 插件的 stdout/stderr 重定向
捕获到日志文件；结构化日志则走 `@spakjs/log` 的 `FileTransport`。
