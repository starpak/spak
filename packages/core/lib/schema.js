"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaService = void 0;
const cosmokit_1 = require("cosmokit");
const cordis_1 = require("cordis");
const context_1 = require("./context");
cordis_1.Schema.dynamic = function dynamic(name) {
    return cordis_1.Schema.any().role('dynamic', { name });
};
cordis_1.Schema.filter = function filter() {
    return cordis_1.Schema.any().role('filter');
};
cordis_1.Schema.computed = function computed(inner, options = {}) {
    return cordis_1.Schema.union([
        cordis_1.Schema.from(inner),
        cordis_1.Schema.object({
            $switch: cordis_1.Schema.object({
                branches: cordis_1.Schema.array(cordis_1.Schema.object({
                    case: cordis_1.Schema.any(),
                    then: cordis_1.Schema.from(inner),
                })),
                default: cordis_1.Schema.from(inner),
            }),
        }).hidden(),
        cordis_1.Schema.any().hidden(),
    ]).role('computed', options);
};
cordis_1.Schema.path = function path(options = {}) {
    return cordis_1.Schema.string().role('path', options);
};
cordis_1.Schema.prototype.computed = function computed(options = {}) {
    return cordis_1.Schema.computed(this, options).default(this.meta.default);
};
const kSchemaOrder = Symbol('schema-order');
class SchemaService {
    ctx;
    _data = Object.create(null);
    constructor(ctx) {
        this.ctx = ctx;
    }
    extend(name, schema, order = 0) {
        const caller = this[context_1.Context.current];
        const target = this.get(name);
        // Sort key: entries without an explicit order behave as if they had
        // +infinity, so unordered entries always sink to the bottom (in the
        // order they were registered), and small-order schemas are inserted
        // before big-order ones. The old comparison `a[kSchemaOrder] < order`
        // compared `undefined < 0 → false` and made all unordered entries
        // behave as if they were order=0, which broke insertion semantics.
        const list = target.list || [];
        const index = list.findIndex(a => (a[kSchemaOrder] ?? Number.POSITIVE_INFINITY) > order);
        schema[kSchemaOrder] = order;
        if (index >= 0) {
            list.splice(index, 0, schema);
        }
        else {
            list.push(schema);
        }
        this.ctx.emit('internal/schema', name);
        caller?.on('dispose', () => {
            (0, cosmokit_1.remove)(list, schema);
            this.ctx.emit('internal/schema', name);
        });
    }
    get(name) {
        return this._data[name] ||= cordis_1.Schema.intersect([]);
    }
    set(name, schema) {
        const caller = this[context_1.Context.current];
        this._data[name] = schema;
        this.ctx.emit('internal/schema', name);
        caller?.on('dispose', () => {
            delete this._data[name];
            this.ctx.emit('internal/schema', name);
        });
    }
}
exports.SchemaService = SchemaService;
//# sourceMappingURL=schema.js.map