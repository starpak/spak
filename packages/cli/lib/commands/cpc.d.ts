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