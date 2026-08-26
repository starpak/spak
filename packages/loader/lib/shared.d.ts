import { Context, Dict, EffectScope, ForkScope, Logger } from '@spakjs/core';
export declare class FullReloadError extends Error {
    readonly code: number;
    constructor(code: number);
}
declare module '@spakjs/core' {
    interface Events {
        'config'(): void;
        'exit'(signal: NodeJS.Signals): Promise<void>;
    }
    interface Context {
        loader: Loader;
    }
    namespace Context {
        interface Config {
            name?: string;
            plugins?: Dict;
        }
    }
    interface EnvData {
        startTime?: number;
    }
}
export declare function unwrapExports(module: any): any;
export declare abstract class Loader {
    static readonly kRecord: unique symbol;
    static readonly exitCode = 51;
    static readonly extensions: Set<string>;
    baseDir: string;
    envData: any;
    params: {
        env: NodeJS.ProcessEnv;
    };
    app: Context;
    config: Context.Config;
    entry: Context;
    suspend: boolean;
    writable: boolean;
    mime: string;
    filename: string;
    envFiles: string[];
    names: Set<string>;
    cache: Dict;
    prolog: Logger.Record[];
    private store;
    private _writeTask?;
    private _writeSilent;
    abstract fullReload(code?: number): void;
    abstract import(name: string): Promise<any>;
    constructor();
    init(filename?: string): Promise<void>;
    private findConfig;
    readConfig(initial?: boolean): Promise<Context.Config>;
    private _writeConfig;
    writeConfig(silent?: boolean): Promise<void>;
    interpolate(source: any): any;
    resolve(name: string): Promise<any>;
    keyFor: (plugin: any) => string | undefined;
    replace: (oldKey: any, newKey: any) => void;
    private forkPlugin;
    isTruthyLike: (expr: any) => boolean;
    private logUpdate;
    reload: (parent: Context, key: string, source: any) => Promise<any>;
    unload: (ctx: Context, key: string) => void;
    getRefName: (fork: ForkScope) => string | undefined;
    paths: (scope: EffectScope) => string[];
    createApp(): Promise<Context>;
}
export default Loader;
//# sourceMappingURL=shared.d.ts.map