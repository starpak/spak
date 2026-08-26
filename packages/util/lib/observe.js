"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.observe = observe;
const cosmokit_1 = require("cosmokit");
const immutable = ['number', 'string', 'bigint', 'boolean', 'symbol', 'function'];
const builtin = ['Date', 'RegExp', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Array'];
function observeProperty(value, update) {
    if ((0, cosmokit_1.is)('Date', value)) {
        return observeDate(value, update);
    }
    else if ((0, cosmokit_1.is)('Map', value)) {
        return observeMap(value, update);
    }
    else if ((0, cosmokit_1.is)('Set', value)) {
        return observeSet(value, update);
    }
    else if (Array.isArray(value)) {
        return observeArray(value, update);
    }
    else {
        return observeObject(value, update);
    }
}
function untracked(key) {
    return typeof key === 'symbol' || key.startsWith('$');
}
function observeObject(target, notify) {
    const update = notify;
    if (!notify) {
        const diff = Object.create(null);
        (0, cosmokit_1.defineProperty)(target, '$diff', diff);
        notify = (key) => {
            if (untracked(key))
                return;
            diff[key] = target[key];
        };
    }
    const proxy = new Proxy(target, {
        get(target, key) {
            const value = Reflect.get(target, key);
            if (!value || immutable.includes(typeof value) || untracked(key))
                return value;
            return observeProperty(value, update || (() => notify(key)));
        },
        set(target, key, value) {
            const unchanged = target[key] === value;
            const result = Reflect.set(target, key, value);
            if (unchanged || !result)
                return result;
            notify(key);
            return true;
        },
        deleteProperty(target, key) {
            const unchanged = !(key in target);
            const result = Reflect.deleteProperty(target, key);
            if (unchanged || !result)
                return result;
            notify(key);
            return true;
        },
    });
    return proxy;
}
const arrayProxyMethods = [
    'pop', 'shift', 'splice', 'sort',
    'push', 'unshift', 'reverse', 'fill', 'copyWithin',
];
function observeArray(target, update) {
    const proxy = {};
    for (const method of arrayProxyMethods) {
        const original = Array.prototype[method];
        (0, cosmokit_1.defineProperty)(target, method, function (...args) {
            update();
            return original.apply(this, args);
        });
    }
    return new Proxy(target, {
        get(target, key) {
            if (key in proxy)
                return proxy[key];
            const value = target[key];
            if (!value || immutable.includes(typeof value) || typeof key === 'symbol' || isNaN(key))
                return value;
            return observeProperty(value, update);
        },
        set(target, key, value) {
            if (typeof key !== 'symbol' && !isNaN(key) && target[key] !== value)
                update();
            return Reflect.set(target, key, value);
        },
    });
}
const mapProxyMethods = ['set', 'delete', 'clear'];
const setProxyMethods = ['add', 'delete', 'clear'];
function observeMap(target, update) {
    for (const method of mapProxyMethods) {
        const original = Map.prototype[method];
        (0, cosmokit_1.defineProperty)(target, method, function (...args) {
            update();
            return original.apply(this, args);
        });
    }
    return target;
}
function observeSet(target, update) {
    for (const method of setProxyMethods) {
        const original = Set.prototype[method];
        (0, cosmokit_1.defineProperty)(target, method, function (...args) {
            update();
            return original.apply(this, args);
        });
    }
    return target;
}
function observeDate(target, update) {
    for (const method of Object.getOwnPropertyNames(Date.prototype)) {
        if (method === 'valueOf')
            continue;
        (0, cosmokit_1.defineProperty)(target, method, function (...args) {
            const oldValue = target.valueOf();
            const result = Date.prototype[method].apply(this, args);
            if (target.valueOf() !== oldValue)
                update();
            return result;
        });
    }
    return target;
}
function observe(target, ...args) {
    if (immutable.includes(typeof target)) {
        throw new Error(`cannot observe immutable type "${typeof target}"`);
    }
    else if (!target) {
        throw new Error('cannot observe null or undefined');
    }
    // Note: Date / Map / Set / Array / WeakSet / WeakMap / RegExp are supported
    // via observeProperty() – they are no longer rejected at the entry point.
    let update = cosmokit_1.noop;
    if (typeof args[0] === 'function')
        update = args.shift();
    // Route through observeProperty so builtin types (Date/Map/Set/Array) take
    // their dedicated observers instead of the generic object proxy.
    const observer = observeProperty(target, null);
    (0, cosmokit_1.defineProperty)(observer, '$update', function $update() {
        const diff = { ...this.$diff };
        const fields = Object.keys(diff);
        if (fields.length) {
            for (const key in this.$diff) {
                delete this.$diff[key];
            }
            return update(diff);
        }
    });
    (0, cosmokit_1.defineProperty)(observer, '$merge', function $merge(value) {
        for (const key in value) {
            if (key in this.$diff) {
                throw new Error(`unresolved diff key "${key}"`);
            }
            const v = value[key];
            if (v !== undefined) {
                target[key] = v;
            }
        }
        return this;
    });
    return observer;
}
//# sourceMappingURL=observe.js.map