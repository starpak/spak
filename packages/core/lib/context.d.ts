import { Promisify } from 'cosmokit';
import { Schema } from 'cordis';
import { GetEvents, Parameters, ReturnType, ThisType } from 'cordis';
import * as cordis from 'cordis';
import { FilterService } from './filter';
import { Commander } from './command';
import { I18n } from './i18n';
import { Processor } from './middleware';
import './permission';
import './schema';
export type EffectScope = cordis.EffectScope<Context>;
export type ForkScope = cordis.ForkScope<Context>;
export type MainScope = cordis.MainScope<Context>;
export { Logger, Schema } from 'cordis';
export { h, Fragment } from '@spakjs/message';
export { resolveConfig } from 'cordis';
export type { Disposable, ScopeStatus, Plugin } from 'cordis';
declare module 'cordis' {
    namespace Plugin {
        interface Object {
            filter?: boolean;
        }
    }
}
export interface EnvData {
}
type OmitSubstring<S extends string, T extends string> = S extends `${infer L}${T}${infer R}` ? `${L}${R}` : never;
type BeforeEventName = OmitSubstring<keyof Events & string, 'before-'>;
type BeforeEventMap = {
    [E in keyof Events & string as OmitSubstring<E, 'before-'>]: Events[E];
};
export interface Events<C extends Context = Context> extends cordis.Events<C> {
}
export interface Context {
    [Context.events]: Events<this>;
    spak: Spak;
    $processor: Processor;
    $filter: FilterService;
    $commander: Commander;
}
export declare class Context extends cordis.Context {
    static shadow: symbol;
    constructor(config?: Context.Config);
    /** @deprecated use `ctx.root` instead */
    get app(): this;
    /** @deprecated */
    waterfall<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>;
    waterfall<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): Promisify<ReturnType<GetEvents<this>[K]>>;
    /** @deprecated */
    chain<K extends keyof GetEvents<this>>(name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>;
    chain<K extends keyof GetEvents<this>>(thisArg: ThisType<GetEvents<this>[K]>, name: K, ...args: Parameters<GetEvents<this>[K]>): ReturnType<GetEvents<this>[K]>;
    before<K extends BeforeEventName>(name: K, listener: BeforeEventMap[K], append?: boolean): () => boolean;
}
export default class Spak extends cordis.Service<Context.Config, Context> {
    config: Context.Config;
    constructor(ctx: Context, config: Context.Config);
}
export declare namespace Context {
    interface Config extends Config.Basic, Config.Advanced {
        i18n?: I18n.Config;
        /** Log module configuration — all modules default to having log access. */
        log?: Config.Log;
    }
    const Config: Config.Static;
    namespace Config {
        interface Basic extends Commander.Config {
            /** Default user authority level used by the built-in permission matcher. */
            defaultAuthority?: number;
            /**
             * Maximum depth for the middleware / command execution stack.
             * Exceeding this throws to prevent runaway recursion from buggy
             * plugins. Mirrors {@link Next.MAX_DEPTH} and is the single source
             * of truth going forward.
             */
            middlewareMaxDepth?: number;
            /**
             * Default locale for the i18n renderer (fallback when the session
             * does not specify one). Example: 'zh', 'en-US', 'ja'.
             * All modules default to having locales (i18n) access.
             */
            locale?: string;
        }
        interface Advanced {
            maxListeners?: number;
        }
        /**
         * Log module configuration.
         * All modules/plugins default to having log access — this config
         * controls the global log level and output destinations.
         */
        interface Log {
            /** Log level: 0=silent, 1=error, 2=warn, 3=info, 4=debug, 5=trace */
            level?: number;
            /** Log file path (when running in daemon mode) */
            file?: string;
            /** Show timestamps in log output */
            showTime?: boolean;
        }
        interface Static extends Schema<Config> {
            Basic: Schema<Basic>;
            I18n: Schema<I18n>;
            Log: Schema<Log>;
            Advanced: Schema<Advanced>;
        }
    }
}
export declare abstract class Service<T = any, C extends Context = Context> extends cordis.Service<T, C> {
    [cordis.Service.setup](): void;
}
export { Context as App };
export declare function defineConfig(config: Context.Config): Context.Config;
//# sourceMappingURL=context.d.ts.map