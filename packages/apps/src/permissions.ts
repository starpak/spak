// ===== @spakjs/apps — .pak 应用权限声明规范（CPC 审查依据）=====
//
// 每个可执行（server 型）应用必须在 spak.app.json 里显式声明 permissions，
// 否则按「最小权限」处理并拒绝加载/安装。这是防 .pak 应用越权的第一道墙：
//
//   network:      none（默认，禁任何出站）| localhost（仅回环）| all（全放行）
//   fs:           none（默认，禁文件 IO）| read（只读）| write（读写）
//   childProcess: false（默认，禁子进程）| true
//
// 静态前端（desktop/staticDir）由浏览器沙箱承接，可省略 permissions。

export type NetworkPermission = 'none' | 'localhost' | 'all'
export type FsPermission = 'none' | 'read' | 'write'

export interface AppPermissions {
  /** 网络访问：none（默认）| localhost | all */
  network: NetworkPermission
  /** 文件系统：none（默认）| read | write */
  fs: FsPermission
  /** 子进程能力：false（默认）| true */
  childProcess: boolean
}

export const DEFAULT_PERMISSIONS: Readonly<AppPermissions> = {
  network: 'none',
  fs: 'none',
  childProcess: false,
}

const NETWORK_VALUES: ReadonlyArray<string> = ['none', 'localhost', 'all']
const FS_VALUES: ReadonlyArray<string> = ['none', 'read', 'write']

export interface PermissionsValidation {
  valid: boolean
  errors: string[]
  permissions?: AppPermissions
}

/**
 * 校验 permissions 声明。非法枚举值一律拒绝（fail-closed）。
 * 未声明（undefined/null）视为缺失——可执行应用必须显式声明。
 */
export function validateAppPermissions(raw: any): PermissionsValidation {
  if (raw === undefined || raw === null) {
    return { valid: false, errors: ['permissions is required for executable apps (network/fs/childProcess)'] }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, errors: ['permissions must be an object: { network, fs, childProcess }'] }
  }

  const errors: string[] = []
  const network = raw.network ?? 'none'
  const fs = raw.fs ?? 'none'
  const childProcess = raw.childProcess ?? false

  if (!NETWORK_VALUES.includes(network)) {
    errors.push(`permissions.network must be one of: none, localhost, all (got "${network}")`)
  }
  if (!FS_VALUES.includes(fs)) {
    errors.push(`permissions.fs must be one of: none, read, write (got "${fs}")`)
  }
  if (typeof childProcess !== 'boolean') {
    errors.push(`permissions.childProcess must be a boolean (got "${childProcess}")`)
  }

  if (errors.length > 0) return { valid: false, errors }
  return {
    valid: true,
    errors: [],
    permissions: { network: network as NetworkPermission, fs: fs as FsPermission, childProcess },
  }
}

/**
 * 归一化权限：把任意原始声明收敛成完整 AppPermissions（缺省=最小权限）。
 * 不会抛错——非法值回落到 'none'/false。
 */
export function normalizeAppPermissions(raw?: any): AppPermissions {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PERMISSIONS }
  }
  return {
    network: NETWORK_VALUES.includes(raw.network) ? raw.network : 'none',
    fs: FS_VALUES.includes(raw.fs) ? raw.fs : 'none',
    childProcess: typeof raw.childProcess === 'boolean' ? raw.childProcess : false,
  }
}

/** 判定是否为可执行（server 型）应用：非静态前端即需代码执行能力。 */
export function isExecutableApp(manifest: {
  desktop?: boolean
  staticDir?: string
  exec?: boolean
}): boolean {
  if (manifest.exec === true) return true
  return !manifest.desktop && !manifest.staticDir
}