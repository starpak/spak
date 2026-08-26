export declare function isInteger(source: any): boolean;
export declare function sleep(ms: number): Promise<void>;
export declare function enumKeys<T extends string>(data: Record<T, string | number>): T[];
export declare function defineEnumProperty<T extends object>(object: T, key: keyof T, value: T[keyof T]): void;
export declare function merge<T extends object>(head: T, base: T): T;
export declare function assertProperty<O, K extends keyof O & string>(config: O, key: K): NonNullable<O[K]>;
export declare function coerce(val: any): string;
export declare function renameProperty<O extends object, K extends keyof O, T extends string>(config: O, key: K, oldKey: T): void;
export declare function makeArray<T>(value: T | T[]): T[];
export declare const Random: {
    int: (min: number, max: number) => number;
    float: (min: number, max: number) => number;
};
export type Dict = Record<string, any>;
export declare function isNullable(value: any): boolean;
export declare function valueMap<K extends string, V>(obj: Record<string, V>, fn: (value: V, key: K) => V): Record<string, V>;
type Methods<T> = {
    [K in keyof T]?: T[K] extends (...args: infer A) => infer R ? (this: T, ...args: A) => R : T[K];
};
export declare function extend<T>(prototype: T, methods: Methods<T>): void;
export {};
//# sourceMappingURL=misc.d.ts.map