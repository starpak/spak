import { Awaitable } from 'cosmokit';
import { Context } from './context';
import { MatchResult } from './i18n';
import { Session } from './session';
declare module './context' {
    interface Context {
        permissions: Permissions;
    }
    interface Events {
        'internal/permission'(): void;
    }
}
export declare namespace Permissions {
    type Links<P extends string> = undefined | string[] | ((data: MatchResult<P>) => undefined | string[]);
    type Check<P extends string> = (data: MatchResult<P>, session: Partial<Session>) => Awaitable<boolean>;
    interface Options<P extends string = string> {
        list?: () => string[];
        check?: Check<P>;
        depends?: Links<P>;
        inherits?: Links<P>;
    }
    interface Entry extends Options {
        match: (string: string) => undefined | MatchResult;
    }
    interface Config {
        authority?: number;
        permissions?: string[];
        dependencies?: string[];
    }
}
export declare class Permissions {
    ctx: Context;
    store: Permissions.Entry[];
    constructor(ctx: Context);
    define<P extends string>(pattern: P, options: Permissions.Options<P>): () => boolean;
    provide<P extends string>(pattern: P, check: Permissions.Check<P>): () => boolean;
    inherit<P extends string>(pattern: P, inherits: Permissions.Links<P>): () => boolean;
    depend<P extends string>(pattern: P, depends: Permissions.Links<P>): () => boolean;
    list(result?: Set<string>): string[];
    check(name: string, session: Partial<Session>): Promise<boolean>;
    subgraph(type: 'inherits' | 'depends', parents: Iterable<string>, result?: Set<string>): Set<string>;
    test(names: Iterable<string>, session?: Partial<Session>, cache?: Map<string, Promise<boolean>>): Promise<boolean>;
}
//# sourceMappingURL=permission.d.ts.map