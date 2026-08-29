import { CommandDeclaration } from '@spakjs/util';
/**
 * Run the whitelist validation step.
 *
 * Discovers every builtin package under /packages and every plugin
 * under /plugins, then verifies each name appears in the hard-coded
 * MODULE_WHITELIST above.
 *
 * If ANY unauthorized module is found:
 *   1. log each offending name via T('spak.cpc.check.whitelist_unknown_module')
 *   2. log a final violation summary
 *   3. call process.exit(1) immediately so the framework cannot boot
 *
 * Returns silently when everything is authorized.
 */
export declare function runModuleWhitelistCheck(failHard?: boolean): {
    unauthorized: string[];
    total: number;
};
/**
 * Sandbox worker 主进程内运行入口（SEA 二进制标记分支）。
 *
 * 封闭二进制里 spawn 子进程用「自 re-exec」：
 *   spawn(process.execPath, ['--spak-sandbox', name])
 * 主 bundle 启动时检测到该标记，直接执行本函数（内嵌代码）；
 * 防火墙来自同包模块引用，无需 cwd 的 node_modules ——
 * 与非 SEA 场景的 `node -e` 字符串脚本行为等价。
 */
export declare function runSandboxWorker(name: string): void;
export declare function isolatePlugin(name: string): void;
export declare function terminateSandbox(name: string): void;
declare const circuitBreakers: Map<string, boolean>;
declare function triggerCircuitBreaker(pluginName: string): void;
declare function restoreCircuitBreaker(pluginName: string): void;
export declare function isAvailable(): boolean;
export declare function ensureAvailable(): void;
export declare function initCPC(config: any): void;
declare const cpcDeclarations: CommandDeclaration[];
export { circuitBreakers, triggerCircuitBreaker, restoreCircuitBreaker };
export default cpcDeclarations;
//# sourceMappingURL=cpc.d.ts.map