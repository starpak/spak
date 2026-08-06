# Logging — `@spakjs/log`

多 transport 的结构化日志包。零第三方依赖，Node 环境（file transport 需要 `fs`），
不依赖 `@spakjs/core`，可被任何项目独立使用。

## 快速开始

```ts
import { createLogger, configureLogger, FileTransport, ConsoleTransport, LogLevel } from '@spakjs/log'

// 全局配置：同时写控制台（染色）+ 文件（纯文本，5MB 自动轮转）
configureLogger({
  level: LogLevel.debug,
  transports: [
    new ConsoleTransport(),
    new FileTransport({ path: 'app.log', maxSize: 5 * 1024 * 1024 }),
  ],
})

const log = createLogger('my-scope')
log.info('服务启动', { port: 3000 })
log.warn('内存偏高', { rss: '420MB' })
log.error('请求失败', new Error('timeout'))
log.debug('调试细节')
```

输出形如：
```
2026-07-29T11:54:03.526Z INFO  [my-scope] 服务启动 {"port":3000}
2026-07-29T11:54:03.527Z WARN  [my-scope] 内存偏高 {"rss":"420MB"}
2026-07-29T11:54:03.528Z ERROR [my-scope] 请求失败 Error: timeout
    at ...
```

## 日志级别

| 值 | 名称 | 说明 |
|---|---|---|
| 0 | `silent` | 静默 |
| 1 | `error` | 错误（走 stderr） |
| 2 | `warn` | 警告（走 stderr） |
| 3 | `info` | 常规信息（走 stdout） |
| 4 | `debug` | 调试 |
| 5 | `trace` | 最详细 |

全局 level 由 `configureLogger({ level })` 控制；每个 transport 还有独立 `level`
字段做二次过滤（transport level ≥ 全局 level 才输出）。

## Transport

所有 transport 继承 `Transport`，实现 `render(record)`。

- **`ConsoleTransport`** — 染色输出到 `process.stdout`（info+）/ `process.stderr`（error/warn）。
  构造可传自定义 `formatter`，默认 `colorFormatter`。
- **`FileTransport`** — `appendFileSync` 追加到文件，超过 `maxSize`（默认 5MB）按时间戳重命名轮转。
  写入失败静默吞掉（日志绝不能把业务打挂）。
- **`StreamTransport`** — 写入任意带 `write(str)` 的对象（如 HTTP 响应、自定义流）。

```ts
new FileTransport({ path: '/var/log/spak.log', maxSize: 10 * 1024 * 1024 })
new StreamTransport(process.stdout, defaultFormatter)
```

## 自定义格式

```ts
import { configureLogger, ConsoleTransport, Formatter } from '@spakjs/log'

const json: Formatter = (r) => JSON.stringify({
  t: r.time.toISOString(), level: r.level, scope: r.scope, msg: r.message, args: r.args,
})

configureLogger({ transports: [new ConsoleTransport(json)] })
```

## 与 cordis Logger 桥接

`@spakjs/core` 内部用的是 cordis 的 `Logger`（`new Logger('scope')`）。要让这些
已有日志也流入 `@spakjs/log` 的 transport 链，调用 `attachCordis`：

```ts
import { Logger as CordisLogger } from '@spakjs/core'
import { attachCordis, configureLogger, FileTransport } from '@spakjs/log'

configureLogger({ transports: [new FileTransport({ path: 'spak.log' })] })
attachCordis({ Logger: CordisLogger })  // 返回 { detach() } 可移除
```

之后 cordis 的日志会被转发为 `scope: 'cordis'` 的 INFO 记录写入你的 transport。

> **注意**：`attachCordis` 是 best-effort 桥接，基于 cordis `Logger.targets` 的
> `{ colors, print(text) }` 契约做特性检测。若 cordis 内部契约变更，它会安全 no-op
> 而非抛错。要保证捕获，优先在本包代码里直接用 `createLogger()`（daemon 插件即如此）。
> 桥接不会清除 cordis 原生 target；如需避免重复输出，自行 `CordisLogger.targets.length = 0`。

## daemon 插件如何使用

`@spakjs/plugin-daemon` 已迁移到本包：用 `createLogger('daemon')` 取代 cordis Logger，
配置 `FileTransport` 写入 `logFile`，并 `attachCordis` 把 cordis 日志也汇入同一文件。
原始的 stdout/stderr 重定向保留作为「非结构化 `console.log`」兜底（详见
[plugins/daemon/src/index.ts](../plugins/daemon/src/index.ts)）。

## API 一览

| 导出 | 说明 |
|---|---|
| `createLogger(scope?, level?)` | 创建带 scope 的 logger（推荐入口） |
| `Logger` | logger 类（facade 中以 `SpakLogger` 暴露，避免与 cordis `Logger` 撞名） |
| `configureLogger(options)` | 设置全局 level / transports / formatter |
| `getLoggerConfig()` | 读取当前全局配置 |
| `attachCordis(mod)` | 桥接 cordis Logger，返回 `{ detach }` |
| `LogLevel`, `LEVEL_NAMES` | 级别枚举与名称表 |
| `Transport`, `ConsoleTransport`, `FileTransport`, `StreamTransport` | transport 基类与实现 |
| `defaultFormatter`, `colorFormatter` | 内置格式化器 |
| `LogRecord`, `Formatter`, `LoggerOptions`, `FileTransportOptions` | 类型 |
