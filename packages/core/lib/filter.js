"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterService = exports.Eval = void 0;
const cosmokit_1 = require("cosmokit");
const context_1 = require("./context");
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
var Eval;
(function (Eval) {
    /**
     * Safely evaluate a $eval expression without using eval().
     * Only supports dot-notation property access on whitelisted objects.
     * @param expr - The expression string to evaluate (e.g., 'env.FOO')
     * @param context - The context object containing env, user, session, etc.
     * @returns The resolved value or undefined if path not found
     */
    function evaluate(expr, context) {
        // Reject any expression that looks like code injection
        // Only allow alphanumeric characters, dots, underscores, and hyphens
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$\-_]*)*$/.test(expr)) {
            throw new Error(`Invalid $eval expression: ${expr}. Only dot-notation property access is allowed.`);
        }
        const parts = expr.split('.');
        let result = context;
        for (const part of parts) {
            if (result == null || typeof result !== 'object') {
                return undefined;
            }
            // Use bracket notation safely with validated key
            result = result[part];
        }
        return result;
    }
    Eval.evaluate = evaluate;
})(Eval || (exports.Eval = Eval = {}));
class FilterService {
    ctx;
    constructor(ctx) {
        this.ctx = ctx;
        (0, cosmokit_1.defineProperty)(this, context_1.Context.current, ctx);
        ctx.filter = () => true;
        ctx.on('internal/runtime', (runtime) => {
            if (!runtime.uid)
                return;
            runtime.ctx.filter = (session) => {
                return runtime.children.some(p => p.ctx.filter(session));
            };
        });
    }
    any() {
        return this.ctx.extend({ filter: () => true });
    }
    never() {
        return this.ctx.extend({ filter: () => false });
    }
    union(arg) {
        const filter = typeof arg === 'function' ? arg : arg.filter;
        return this.ctx.extend({ filter: (s) => this.ctx.filter(s) || filter(s) });
    }
    intersect(arg) {
        const filter = typeof arg === 'function' ? arg : arg.filter;
        return this.ctx.extend({ filter: (s) => this.ctx.filter(s) && filter(s) });
    }
    exclude(arg) {
        const filter = typeof arg === 'function' ? arg : arg.filter;
        return this.ctx.extend({ filter: (s) => this.ctx.filter(s) && !filter(s) });
    }
}
exports.FilterService = FilterService;
//# sourceMappingURL=filter.js.map