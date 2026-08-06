/**
 * Spak 官网全局站点数据
 * 集中管理导航、包列表、插件列表、对比数据等
 */
export const SITE = {
  name: 'Spak',
  version: '0.0.7',
  tagline: 'A multi-file service project framework based on Koishi',
  description:
    'Spak 是基于 Koishi 的多文件服务项目框架，提供插件化应用的结构化组织方式，内置配置管理、国际化、CLI 工具、服务编排与独立日志系统。',
  repo: 'https://github.com/starpak/spak',
  docs: 'https://github.com/starpak/spak/tree/master/docs',
  npm: 'https://www.npmjs.com/package/spak',
  license: 'MIT',
} as const;

export interface NavItem { label: string; href: string; desc?: string }

export const NAV_ITEMS: NavItem[] = [
  { label: '首页', href: '/', desc: '概览与快速开始' },
  { label: '指南', href: '/guide', desc: '安装、配置与运行' },
  { label: '包', href: '/packages', desc: '8 个核心包总览' },
  { label: '插件', href: '/plugins', desc: '4 个官方插件' },
];

export interface PkgInfo {
  name: string;
  npm: string;
  emoji: string;
  desc: string;
  role: string;
  version: string;
  status: 'stable' | 'beta' | 'alpha';
  deps: string[];
  exports: string[];
}

export const PACKAGES: PkgInfo[] = [
  {
    name: '@spakjs/core', npm: 'core', emoji: '🧠', version: '0.0.7', status: 'stable',
    desc: '核心框架：命令、中间件、i18n、权限、Schema、会话管理',
    role: '纯运行时内核（Logic Core）',
    deps: ['@spakjs/util', '@spakjs/message'],
    exports: ['Context', 'Commander', 'Processor', 'Schema', 'Session', 'Filter'],
  },
  {
    name: '@spakjs/cli', npm: 'spak-cli', emoji: '🎮', version: '0.0.7', status: 'stable',
    desc: 'CLI 入口：spak serve / config / cpc / status，全彩输出',
    role: '命令行门面',
    deps: ['@spakjs/core', '@spakjs/loader', '@spakjs/config'],
    exports: ['spak serve', 'spak config', 'spak cpc', 'spak status'],
  },
  {
    name: '@spakjs/loader', npm: 'loader', emoji: '📂', version: '0.0.7', status: 'stable',
    desc: '配置加载器，支持 YAML/JSON、env 文件、插件解析与生命周期',
    role: '配置与生命周期',
    deps: ['@spakjs/core'],
    exports: ['Loader', 'loadConfig', 'resolvePlugin', 'lifecycle'],
  },
  {
    name: '@spakjs/config', npm: 'config', emoji: '⚙️', version: '0.0.1', status: 'beta',
    desc: '中央配置管理器，持久化到 ~/.spak/config.json',
    role: '用户配置存储',
    deps: [],
    exports: ['ConfigManager', 'get', 'set', 'persist'],
  },
  {
    name: '@spakjs/i18n', npm: 'i18n', emoji: '🌐', version: '0.0.1', status: 'beta',
    desc: '集成式 i18n：locale 树、回退算法、yml 加载器、T() 助手',
    role: '国际化内核',
    deps: [],
    exports: ['LocaleTree', 'T()', 'fallback', 'loadYml'],
  },
  {
    name: '@spakjs/log', npm: 'log', emoji: '📝', version: '0.0.1', status: 'stable',
    desc: '独立日志模块：多传输（Console/File/Stream）、分级、结构化',
    role: '独立日志系统',
    deps: [],
    exports: ['Logger', 'Console', 'File', 'Stream', 'levels'],
  },
  {
    name: '@spakjs/message', npm: 'message', emoji: '💬', version: '0.0.1', status: 'beta',
    desc: '消息助手与元素工具：h/Fragment/escape/parse/normalize',
    role: '虚拟 DOM 消息',
    deps: [],
    exports: ['h', 'Fragment', 'escape', 'parse', 'normalize'],
  },
  {
    name: '@spakjs/util', npm: 'util', emoji: '🧰', version: '0.0.1', status: 'stable',
    desc: '工具函数：coerce/observe/interpolate/Random/Command 声明',
    role: '零副作用工具库',
    deps: [],
    exports: ['coerce', 'observe', 'interpolate', 'Random', 'cosmokit'],
  },
];

export interface PluginInfo {
  name: string;
  emoji: string;
  desc: string;
  version: string;
  status: 'stable' | 'beta' | 'alpha';
  category: 'server' | 'client' | 'dev' | 'ops';
  features: string[];
  configKeys: { key: string; type: string; default: string; desc: string }[];
  lifecycle: string[];
}

export const PLUGINS: PluginInfo[] = [
  {
    name: '@spakjs/plugin-server', emoji: '🖥️', version: '0.0.7', status: 'stable', category: 'server',
    desc: 'Server 服务与路由（HTTP / Socket）',
    features: ['HTTP / Socket 双协议路由', '静态资源托管', '与 core 中间件链集成', '热重启支持', 'CORS 与压缩'],
    configKeys: [
      { key: 'host', type: 'string', default: '0.0.0.0', desc: '监听地址' },
      { key: 'port', type: 'number', default: '4321', desc: '监听端口' },
      { key: 'cors', type: 'boolean', default: 'false', desc: '是否启用 CORS' },
      { key: 'static', type: 'string', default: "'./public'", desc: '静态资源目录' },
    ],
    lifecycle: ['register', 'start', 'ready', 'reload', 'stop'],
  },
  {
    name: '@spakjs/plugin-http', emoji: '🌐', version: '0.0.1', status: 'beta', category: 'client',
    desc: 'HTTP 与 WebSocket 客户端',
    features: ['HTTP 客户端封装', 'WebSocket 客户端', '请求/响应拦截器', '统一超时与重试', '请求取消'],
    configKeys: [
      { key: 'timeout', type: 'number', default: '30000', desc: '请求超时（ms）' },
      { key: 'retries', type: 'number', default: '3', desc: '失败重试次数' },
      { key: 'baseUrl', type: 'string', default: "''", desc: '基础 URL' },
    ],
    lifecycle: ['init', 'request', 'response', 'error', 'dispose'],
  },
  {
    name: '@spakjs/plugin-hmr', emoji: '🔥', version: '0.0.1', status: 'alpha', category: 'dev',
    desc: '开发环境热模块替换（HMR）',
    features: ['文件变更监听', '模块级热替换', '保留运行时状态', '错误回退', '增量构建'],
    configKeys: [
      { key: 'watch', type: 'string[]', default: "['./src']", desc: '监听目录' },
      { key: 'ignore', type: 'string[]', default: "['node_modules']", desc: '忽略目录' },
      { key: 'enabled', type: 'boolean', default: 'true', desc: '是否启用' },
    ],
    lifecycle: ['watch', 'change', 'dispose', 'reload', 'recover'],
  },
  {
    name: '@spakjs/plugin-daemon', emoji: '👻', version: '0.0.1', status: 'beta', category: 'ops',
    desc: '后台守护进程：日志落盘、脱离终端',
    features: ['脱离终端后台运行', '日志自动落盘', 'PID 文件管理', '优雅停止', '进程信号处理'],
    configKeys: [
      { key: 'enabled', type: 'boolean', default: 'false', desc: '是否启用守护' },
      { key: 'logFile', type: 'string', default: "'spak.log'", desc: '日志文件路径' },
      { key: 'pidFile', type: 'string', default: "'.spak.pid'", desc: 'PID 文件路径' },
    ],
    lifecycle: ['fork', 'detach', 'monitor', 'signal', 'cleanup'],
  },
];

/** 框架对比数据 */
export const COMPARISON = [
  { feature: '多文件服务组织', spak: true, koishi: true, none: false },
  { feature: '插件化架构', spak: true, koishi: true, none: false },
  { feature: '内置 i18n', spak: true, koishi: true, none: false },
  { feature: '独立日志系统', spak: true, koishi: false, none: false },
  { feature: '中央配置持久化', spak: true, koishi: false, none: false },
  { feature: '彩色 CLI 工具', spak: true, koishi: false, none: false },
  { feature: '热模块替换', spak: true, koishi: false, none: false },
  { feature: '守护进程模式', spak: true, koishi: false, none: false },
  { feature: '浏览器可跑内核', spak: true, koishi: false, none: false },
];

/** 里程碑时间线 */
export const MILESTONES = [
  { version: 'v0.0.1', date: '2025 Q1', title: '项目立项', desc: '从 usefor 重构为 util，确立 monorepo 架构' },
  { version: 'v0.0.3', date: '2025 Q2', title: '内核成型', desc: 'core / loader / cli 三大核心包稳定' },
  { version: 'v0.0.7', date: '2025 Q3', title: '当前版本', desc: 'i18n 独立包 + 官网岛屿架构上线' },
  { version: 'v0.1.x', date: '2025 Q4', title: '下一个版本', desc: '插件市场 + 性能优化 + 完整文档' },
];

/** 信任徽章：技术栈标识 */
export const STACK_BADGES = [
  { label: 'TypeScript', emoji: '🔷' },
  { label: 'Koishi', emoji: '🤖' },
  { label: 'pnpm', emoji: '📦' },
  { label: 'Node.js ≥18', emoji: '🟢' },
  { label: 'MIT License', emoji: '⚖️' },
  { label: 'ESM Only', emoji: '⚡' },
];

/** 用户引用 / 评价（虚构，作为示意） */
export const QUOTES = [
  { text: '从单文件脚本迁移到 Spak 多文件服务后，团队代码组织立刻清晰了——插件边界明确，i18n 和日志开箱即用。', author: '后端工程师', role: '机器人平台团队', emoji: '🛠️' },
  { text: 'core 能在浏览器里跑这点太香了，我们用它做了一套命令预览工具，CI 里直接验证命令解析结果。', author: '前端开发', role: '工具链团队', emoji: '🌐' },
  { text: '中央配置 + 守护进程的组合，让生产部署变得和开发环境一样简单，再也不用手写 systemd。', author: '运维工程师', role: '基础设施团队', emoji: '👻' },
];

/** FAQ */
export const FAQ = [
  {
    q: 'Spak 和 Koishi 是什么关系？',
    a: 'Spak 基于 Koishi 的底层（cordis）构建，但聚焦于"多文件服务项目"的组织方式。core 是纯运行时内核，spak 主包是装配好的整车入口，丰俭由人——你可以单独用内核，也可以直接用整车。',
  },
  {
    q: '能在浏览器里运行吗？',
    a: '可以。@spakjs/core 不依赖 fs / process，可在浏览器端直接运行；@spakjs/message 和 @spakjs/util 同样是零副作用。只有 loader / config / log 等带 Node IO 的包需要 Node 环境。',
  },
  {
    q: '为什么 core 是核心，但 spak 又是主包？',
    a: 'core 是"引擎"，spak 是"整车"。spak 主包不实现任何业务逻辑，只做两件事：re-export 所有子包 API，并提供 createApp() glue 函数把 core + loader + i18n 串起来。两者职责不冲突。',
  },
  {
    q: '生产环境怎么部署？',
    a: '推荐启用 @spakjs/plugin-daemon，让进程脱离终端、日志自动落盘。配合 spak serve --daemon 即可，无需手写 systemd 或 PM2 配置。',
  },
  {
    q: '支持哪些包管理器？',
    a: 'pnpm / npm / yarn 均可。但项目本身用 pnpm workspace 管理 monorepo，贡献代码时建议使用 pnpm。',
  },
  {
    q: 'i18n 怎么用？',
    a: '在代码里用 T(key, params?) 包裹字符串即可。语言切换通过 spak config set language zh / en，由 @spakjs/i18n 提供 locale 树 + 回退算法 + yml 加载器。',
  },
];
