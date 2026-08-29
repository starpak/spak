// Ambient 声明：spm build 的 esbuild 虚拟模块 + postject（无 @types）
declare module 'spak-internal:locales' {
  const locales: Record<string, Record<string, string>>
  export = locales
}

declare module 'spak-internal:app-entry' {
  const entry: any
  export = entry
}

declare module 'postject' {
  export function inject(
    executablePath: string,
    resourceName: string,
    resourceData: Buffer,
    options?: { sentinelFuse?: string; machoSegmentName?: string },
  ): Promise<void>
}