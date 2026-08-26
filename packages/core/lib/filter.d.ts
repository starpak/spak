import { Context } from './context';
import { Session } from './session';
/**
 * Safe evaluation of $eval expressions using path-based interpolation.
 * Only supports safe property access patterns like:
 * - 'env.FOO' - access environment variable
 * - 'user.name' - access user property
 * - 'session.id' - access session property
 *
 * Does NOT support arbitrary JavaScript execution.
 * The expression is evaluated using the safe interpolate function.
 * @example { $eval: 'env.FOO' }
 */
export declare namespace Eval {
    type Expr<T> = {
        $eval: string;
    } | {
        [K: string]: any;
    };
    /**
     * Safely evaluate a $eval expression without using eval().
     * Only supports dot-notation property access on whitelisted objects.
     * @param expr - The expression string to evaluate (e.g., 'env.FOO')
     * @param context - The context object containing env, user, session, etc.
     * @returns The resolved value or undefined if path not found
     */
    function evaluate<T>(expr: string, context: Record<string, any>): T | undefined;
}
export declare namespace Computed {
    interface Options {
    }
}
export type Computed<T> = T | Eval.Expr<T> | ((session: Session) => T);
export type Filter = (session: Session) => boolean;
declare module './context' {
    interface Context {
        $filter: FilterService;
        filter: Filter;
        any(): this;
        never(): this;
        union(arg: Filter | this): this;
        intersect(arg: Filter | this): this;
        exclude(arg: Filter | this): this;
    }
}
export declare class FilterService {
    private ctx;
    constructor(ctx: Context);
    any(): Context;
    never(): Context;
    union(arg: Filter | Context): Context;
    intersect(arg: Filter | Context): Context;
    exclude(arg: Filter | Context): Context;
}
//# sourceMappingURL=filter.d.ts.map