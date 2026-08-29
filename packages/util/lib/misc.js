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
exports.projectDataDir = projectDataDir;
exports.projectDataSubDir = projectDataSubDir;
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
const path_1 = require("path");
function extend(prototype, methods) {
    Object.defineProperties(prototype, Object.getOwnPropertyDescriptors(methods));
}
// ===== Spak 项目数据目录 =====
//
// 存储策略：一切数据（应用、registry、config、pid、缓存）都落在
// 「项目源码所在根」下的 data/ 子目录——不写全局 ~/.spak。
// 优先尊重 SPAK_DATA_DIR 环境变量（二进制/CI 可显式指定）。
function projectDataDir(cwd) {
    return process.env.SPAK_DATA_DIR || (0, path_1.resolve)(cwd || process.cwd(), 'data');
}
/** Spak 数据目录下某个子目录（如 apps / registry / pid）。 */
function projectDataSubDir(name, cwd) {
    return (0, path_1.resolve)(projectDataDir(cwd), name);
}
//# sourceMappingURL=misc.js.map