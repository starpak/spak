import { CAC } from 'cac'
import { CommandDeclaration } from './types'
import { getCurrentLanguage } from '@spakjs/i18n'

/** English → Chinese translations for command/option descriptions in help. */
const ZH_DESC: Record<string, string> = {
  // serve
  'start spak application': '启动 Spak 应用',
  'config file path': '配置文件路径',
  'specify debug namespace': '指定调试命名空间',
  'specify log level (default: 2)': '指定日志级别（默认：2）',
  'show timestamp in logs': '在日志中显示时间戳',
  'specify server host (default: 0.0.0.0)': '指定服务器主机（默认：0.0.0.0）',
  'specify server port (default: 4321)': '指定服务器端口（默认：4321）',
  'stop running spak instance': '停止正在运行的 Spak 实例',
  'restart running spak instance': '重启正在运行的 Spak 实例',
  'force kill running spak instance': '强制终止正在运行的 Spak 实例',
  'no-sandbox': '',
  'disable plugin sandbox (WARNING: unsafe, plugins run without isolation)': '禁用插件沙箱（警告：不安全，插件将无隔离运行）',
  'show spak service status': '显示 Spak 服务状态',
  'inject @spakjs/locales dependency and create empty locales dir for each package in workspace': '为工作区每个包注入 i18n 依赖并创建 locales 目录',
  // config
  'Manage Spak configuration': '管理 Spak 配置',
  'List all configuration': '列出所有配置',
  'Get a configuration value': '获取配置值',
  'Set a configuration value': '设置配置值',
  'Configuration key': '配置键',
  'Configuration value': '配置值',
  // cpc
  'Run CPC test suite': '运行 CPC 测试套件',
  'Check Plug-in Collection commands': '检查插件集合命令',
  'Subcommand: check, sandbox, ssetps, circuit, status': '子命令：check, sandbox, ssetps, circuit, status',
  'Plugin name argument': '插件名参数',
  'Sub-action argument': '子操作参数',
  'Check all plugins and built-in packages': '检查所有插件和内置包',
  'Isolate a plugin in sandbox': '在沙箱中隔离插件',
  'Plugin name': '插件名',
  'Start SSetPS monitoring (memoryLimitMB from config, or SPAK_SSETPS_MEMORY_LIMIT_MB env)': '启动 SSetPS 监控（从配置读取 memoryLimitMB，或使用 SPAK_SSETPS_MEMORY_LIMIT_MB 环境变量）',
  'Trigger circuit breaker for a plugin': '触发插件的熔断器',
  'Show CPC status': '显示 CPC 状态',
}

/** Localize a description for help output based on the current language. */
function l10n(desc: string): string {
  if (!desc) return desc
  const lang = getCurrentLanguage().toLowerCase()
  if (lang.startsWith('zh')) return ZH_DESC[desc] || desc
  return desc
}

/**
 * Register all commands as flat commands (does not support cac nested subcommands).
 * Uses allowUnknownOptions + manual matching to support subcommand routing.
 */

/** Exposed for index.ts to generate help text early */
export function generateCommandHelp(rootName: string, declarations: CommandDeclaration[]): string {
  const rootDecl = declarations.find(d => d.command === rootName)
  const children = declarations.filter(d => d.command.startsWith(rootName + ' ') && d.command !== rootName)
  return generateHelp(rootName, rootDecl, children)
}

/** Generate help text for subcommands */
function generateHelp(rootName: string, rootDecl: CommandDeclaration | undefined, children: CommandDeclaration[]): string {
  // Prioritize subcommand display over leaf args/options
  if (children.length > 0) {
    let text = `\nUsage:\n  $ spak ${rootName} <command>\n\nCommands:\n`
    for (const child of children) {
      const parts = child.command.split(' ').slice(1)
      const usage = parts.map(p => {
        if (p.startsWith('<')) return p
        if (p.startsWith('[')) return p
        return p
      }).join(' ')
      const display = `${rootName} ${usage}`
      const padding = display.length > 28 ? 1 : 28 - display.length
      text += `  ${display}${' '.repeat(padding)}${l10n(child.description)}\n`
    }
    text += `\nOptions:\n  -h, --help  Display this message\n`
    return text
  }

  if (rootDecl) {
    // Has args/options, so it is a leaf command; or just a description-only command
    let text = `\nUsage:\n  $ spak ${rootName}`
    if (rootDecl.args) {
      for (const arg of rootDecl.args) {
        text += arg.required ? ` <${arg.name}>` : ` [${arg.name}]`
      }
    }
    text += '\n'
    if (rootDecl.description) text += `\n${l10n(rootDecl.description)}\n`
    if (rootDecl.args?.length) {
      text += '\nArguments:\n'
      for (const arg of rootDecl.args) {
        text += `  ${arg.name}${' '.repeat(Math.max(1, 20 - arg.name.length))}${l10n(arg.description)}\n`
      }
    }
    if (rootDecl.options?.length) {
      text += '\nOptions:\n'
      for (const opt of rootDecl.options) {
        text += `  --${opt.name}${' '.repeat(Math.max(1, 20 - opt.name.length))}${l10n(opt.description)}`
        if (opt.default) text += ` (default: ${opt.default})`
        text += '\n'
      }
    }
    text += '  -h, --help                Display this message\n'
    return text
  }

  return ''
}

export function registerDeclarations(cli: CAC, declarations: CommandDeclaration[]) {
  // Collect root commands (each top-level command has one entry)
  const rootCmdNames = new Set<string>()
  for (const decl of declarations) {
    const root = decl.command.split(' ')[0]
    rootCmdNames.add(root)
  }

  // Pre-generate help text mapping
  const helpTexts = new Map<string, string>()
  for (const rootName of rootCmdNames) {
    const rootDecl = declarations.find(d => d.command === rootName)
    const children = declarations.filter(d => d.command.startsWith(rootName + ' ') && d.command !== rootName)
    helpTexts.set(rootName, generateHelp(rootName, rootDecl, children))
  }

  for (const rootName of rootCmdNames) {
    const rootDecl = declarations.find(d => d.command === rootName)
    const children = declarations.filter(d => d.command.startsWith(rootName + ' ') && d.command !== rootName)
    const helpText = helpTexts.get(rootName) || ''

    const cmd = cli.command(rootName, l10n(rootDecl?.description || ''))
    cmd.allowUnknownOptions()

    // Register options
    const allOptions = new Map<string, string>()
    for (const decl of [rootDecl, ...children].filter(Boolean)) {
      if (decl?.options) {
        for (const opt of decl.options) {
          if (!allOptions.has(opt.name)) {
            allOptions.set(opt.name, opt.description)
            cmd.option(`--${opt.name}${opt.default ? ` [${opt.name}]` : ''}`, opt.description)
          }
        }
      }
    }

    cmd.action((...args: any[]) => {
      // cac puts options as the last arg, positional args come before
      const rawOpts = args[args.length - 1] || {}
      const options = rawOpts?.options || rawOpts
      const positional: string[] = args.slice(0, -1).filter((a: any) => typeof a === 'string')

      // Extract subcommand from process.argv
      const argv = process.argv
      const rootIdx = argv.indexOf(rootName)
      const subArgs = rootIdx >= 0 ? argv.slice(rootIdx + 1).filter(a => !a.startsWith('-')) : []
      const subCmd = subArgs.join(' ')

      // Handle --help
      const helpFlags = ['--help', '-h']
      const hasHelp = argv.slice(rootIdx + 1).some(a => helpFlags.includes(a))
      if (hasHelp || (subArgs.length === 0 && children.length > 0 && !rootDecl?.args?.length)) {
        console.log(helpText)
        return
      }

      // Find matching command declaration (longest match first)
      let matchedDecl: CommandDeclaration | undefined
      let matchedLen = 0
      for (const decl of declarations) {
        const parts = decl.command.split(' ')
        if (parts[0] !== rootName) continue
        if (parts.length === 1) continue // Root command, fallback later
        // Check if it matches the subcommand path
        const subParts = parts.slice(1)
        let match = true
        for (let i = 0; i < subParts.length; i++) {
          // If argument placeholder (<xxx> or [xxx]), match any value
          if (subParts[i].startsWith('<') || subParts[i].startsWith('[')) continue
          if (subParts[i] !== subArgs[i]) { match = false; break }
        }
        if (match && parts.length > matchedLen) {
          matchedDecl = decl
          matchedLen = parts.length
        }
      }

      // If no subcommand matched, fall back to root command
      if (!matchedDecl) matchedDecl = rootDecl
      if (!matchedDecl) return

      // Extract named arguments from declaration's args array
      // subArgs includes subcommand tokens (e.g. ['set', 'language', 'en']),
      // so skip the subcommand word count to get to actual argument values
      const namedArgs: Record<string, string> = {}
      if (matchedDecl.args) {
        const declParts = matchedDecl.command.split(' ')
        const subCmdWordCount = declParts.length - 1  // number of subcommand words
        for (let i = 0; i < matchedDecl.args.length; i++) {
          const arg = matchedDecl.args[i]
          namedArgs[arg.name] = subArgs[subCmdWordCount + i] || ''
        }
      }

      matchedDecl.action(namedArgs, options)
    })
  }
}
