import { Awaitable, Dict } from 'cosmokit';
import { EventOptions, Hook } from 'cordis';
import { Fragment } from '@spakjs/message';
import { Session } from './session';
import { Context } from './context';
declare module './context' {
    interface Context {
        $processor: Processor;
        middleware<S extends Session = Session>(middleware: Middleware<S>, prepend?: boolean): () => boolean;
    }
    interface Events {
        'middleware'(session: Session): void;
    }
}
export declare class SessionError extends Error {
    path: string | string[];
    param?: Dict | undefined;
    constructor(path: string | string[], param?: Dict | undefined);
}
export type Next = (next?: Next.Callback) => Promise<void | Fragment | string>;
export type Middleware<S extends Session = Session> = (session: S, next: Next) => Awaitable<void | Fragment | string>;
export declare namespace Next {
    const MAX_DEPTH = 64;
    type Queue = ((next?: Next) => Awaitable<void | Fragment | string>)[];
    type Callback = void | string | ((next?: Next) => Awaitable<void | Fragment | string>);
    function compose(callback: Callback, next?: Next): Promise<string | void | Fragment<any>>;
}
export declare class Processor {
    private ctx;
    _hooks: Hook[];
    _sessions: Dict<Session>;
    constructor(ctx: Context);
    middleware(middleware: Middleware, options?: boolean | EventOptions): () => any;
}
export declare namespace SharedCache {
    interface Entry<T> {
        value: T;
        key: string;
        refs: Set<number>;
    }
}
export declare class SharedCache<T> {
    #private;
    get(ref: number, key: string): T | undefined;
    set(ref: number, key: string, value: T): void;
    delete(ref: number): void;
}
//# sourceMappingURL=middleware.d.ts.map