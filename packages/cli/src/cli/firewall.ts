// ===== cli/firewall.ts — CPC 防火墙引擎（net 层真拦截，非 stub）=====
//
// 在 net.Socket.connect 层打补丁，按规则集 allow/deny 出站连接。
// 规则格式（与 CLI 面一致）："action: target"
//   action = allow | deny
//   target = localhost | external | <hostname> | <ip>[:port]
//
// 策略：fail-closed——没有规则命中时默认 deny。默认安装
// ["allow: localhost", "deny: external"]，放行回环、拒绝其余出站。
// 兼容 http/https/ws 等一切最终走 net.connect 的上层模块。
//
// 支持向沙箱子进程传递：SPAK_FIREWALL_RULES=<JSON array>，子进程
// 内 applyFirewallFromEnv() 即装同等规则。

import * as net from 'net'
import * as tls from 'tls'

export interface FirewallRule {
  action: 'allow' | 'deny'
  target: string
}

const DEFAULT_RULES: FirewallRule[] = [
  { action: 'allow', target: 'localhost' },
  { action: 'deny', target: 'external' },
]

let rules: FirewallRule[] = []
let patched = false

export function parseFirewallRule(str: string): FirewallRule | null {
  const m = /^(allow|deny):\s*(.+)$/i.exec(str.trim())
  if (!m) return null
  return { action: m[1].toLowerCase() as 'allow' | 'deny', target: m[2].trim().toLowerCase() }
}

/** 判断 host 是否回环地址（127.x / ::1 / localhost）。 */
function isLoopback(host: string | undefined): boolean {
  const h = (host || '').toLowerCase()
  if (!h || h === 'localhost') return true
  if (h === '::1' || h === '[::1]' || h === '0:0:0:0:0:0:0:1' || h === '[0:0:0:0:0:0:0:1]') return true
  if (h.startsWith('127.')) return true
  if (h === '::' || h === '0.0.0.0') return true
  return false
}

function targetMatches(rule: FirewallRule, host: string | undefined, port: number | undefined): boolean {
  const t = rule.target
  const h = (host || '').toLowerCase()
  if (t === 'localhost') return isLoopback(h)
  if (t === 'external') return !isLoopback(h)
  // 形如 "example.com:443" 或 "example.com" 或 "1.2.3.4:80"
  const [hostPart, portPart] = t.split(':')
  if (portPart !== undefined) {
    const hp = Number(portPart)
    return (hostPart ? h === hostPart : true) && port === hp
  }
  return h === t
}

/** 判定某连接是否被放行。fail-closed：无命中规则 → deny。 */
function decide(host: string | undefined, port: number | undefined): { allowed: boolean; rule?: FirewallRule } {
  // UNIX socket / 无目标主机的连接（如 IPC）不在出站网络范畴，放行。
  if (!host && (!port || port === 0)) return { allowed: true }
  for (const rule of rules) {
    if (targetMatches(rule, host, port)) {
      return { allowed: rule.action === 'allow', rule }
    }
  }
  return { allowed: false }
}

function check(host: string | undefined, port: number | undefined): void {
  const { allowed, rule } = decide(host, port)
  if (!allowed) {
    const denied = new Error(
      `CFW-DENY: outbound connection to ${host || '?'}:${port ?? '?'} blocked ` +
      `(rule: ${rule ? `${rule.action}:${rule.target}` : 'no-match(default deny)'})`,
    ) as Error & { code: string }
    denied.code = 'ECFWACCESS'
    throw denied
  }
}

function patchTls(): void {
  const origTlsConnect = (tls.connect as unknown) as (...a: unknown[]) => unknown
  const wrapped = function (...args: unknown[]) {
    const opts = (args[0] || {}) as { host?: string; port?: number }
    const host = opts.host
    const port = typeof opts.port === 'number' ? opts.port : (typeof args[0] === 'number' ? (args[0] as number) : undefined)
    check(host, port)
    return origTlsConnect.apply(this as unknown, args)
  }
  // module namespace 属性通常是 getter-only，defineProperty 失败则依赖
  // net.Socket 层拦截兜底（TLS 底层同样经过 net 建立连接）。
  try {
    Object.defineProperty(tls, 'connect', { value: wrapped, writable: true, configurable: true })
  } catch {
    try { (tls.connect as unknown) = wrapped } catch { /* net 层兜底 */ }
  }
}

function patchNet(): void {
  if (patched) return
  patched = true

  const origConnect = net.Socket.prototype.connect as unknown as (...args: unknown[]) => unknown

  net.Socket.prototype.connect = function (...args: unknown[]) {
    const first = args[0]
    let host: string | undefined
    let port: number | undefined
    if (typeof first === 'number') {
      port = first
      host = typeof args[1] === 'string' ? args[1] : 'localhost'
    } else if (typeof first === 'object' && first !== null) {
      const o = first as { host?: string; port?: number }
      host = o.host
      port = typeof o.port === 'number' ? o.port : undefined
    } else if (typeof first === 'string') {
      // path 形式（UNIX socket/pipe）→ 放行
    }
    check(host, port)
    return origConnect.apply(this, args)
  }

  patchTls()
}

/**
 * （重）安装防火墙规则。默认规则为允许回环 + 拒绝外部。
 */
export function installFirewall(newRules?: FirewallRule[]): void {
  rules = newRules && newRules.length > 0 ? newRules : [...DEFAULT_RULES]
  patchNet()
}

/** 追加一条 CLI 格式规则："allow: localhost" / "deny: example.com:443"。 */
export function addFirewallRule(cliRule: string): { ok: boolean; rule?: FirewallRule } {
  const rule = parseFirewallRule(cliRule)
  if (!rule) return { ok: false }
  rules = rules.filter(r => !(r.action === rule.action && r.target === rule.target))
  rules.unshift(rule)
  patchNet()
  return { ok: true, rule }
}

export function resetFirewallRules(): void {
  rules = []
}

export function getFirewallRules(): FirewallRule[] {
  return [...rules]
}

export function isFirewallInstalled(): boolean {
  return patched
}

/** 沙箱子进程入口：从 SPAK_FIREWALL_RULES 环境变量安装同等规则。 */
export function applyFirewallFromEnv(): void {
  const raw = process.env.SPAK_FIREWALL_RULES
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      installFirewall(parsed.filter((r: any) => r && (r.action === 'allow' || r.action === 'deny') && typeof r.target === 'string'))
    }
  } catch {
    /* 含混规则直接忽略，保持进程可启动 */
  }
}