"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Random = void 0;
exports.isInteger = isInteger;
exports.sleep = sleep;
exports.enumKeys = enumKeys;
exports.defineEnumProperty = defineEnumProperty;
exports.merge = merge;
exports.assertProperty = assertProperty;
exports.coerce = coerce;
exports.renameProperty = renameProperty;
exports.makeArray = makeArray;
exports.isNullable = isNullable;
exports.valueMap = valueMap;
exports.extend = extend;
function isInteger(source) {
    return typeof source === 'number' && Math.floor(source) === source;
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function enumKeys(data) {
    return Object.values(data).filter(value => typeof value === 'string');
}
function defineEnumProperty(object, key, value) {
    object[key] = value;
    object[value] = key;
}
function merge(head, base) {
    Object.entries(base).forEach(([key, value]) => {
        // prevent prototype pollution attack — check BEFORE any write
        if (key === '__proto__' || key === 'constructor' || key === 'prototype')
            return;
        if (!Object.hasOwn(head, key)) {
            ;
            head[key] = value;
            return;
        }
        if (typeof value === 'object' && typeof head[key] === 'object') {
            ;
            head[key] = merge(head[key], value);
        }
        else {
            ;
            head[key] = value;
        }
    });
    return head;
}
function assertProperty(config, key) {
    if (!config[key])
        throw new Error(`missing configuration "${key}"`);
    return config[key];
}
function coerce(val) {
    // resolve error when stack is undefined, e.g. axios error with status code 401
    const { message, stack } = val instanceof Error && val.stack ? val : new Error(val);
    const lines = (stack || '').split('\n');
    const index = lines.findIndex(line => line.endsWith(message));
    return lines.slice(index).join('\n');
}
function renameProperty(config, key, oldKey) {
    config[key] = Reflect.get(config, oldKey);
    Reflect.deleteProperty(config, oldKey);
}
function makeArray(value) {
    return Array.isArray(value) ? value : [value];
}
exports.Random = {
    int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    float: (min, max) => Math.random() * (max - min) + min,
};
function isNullable(value) {
    return value == null;
}
function valueMap(obj, fn) {
    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = fn(obj[key], key);
        }
    }
    return result;
}
function extend(prototype, methods) {
    Object.defineProperties(prototype, Object.getOwnPropertyDescriptors(methods));
}
//# sourceMappingURL=misc.js.map