export type Observed<T, R = any> = T & {
    $diff: Partial<T>;
    $update: () => R;
    $merge: (value: Partial<T>) => Observed<T, R>;
};
type UpdateFunction<T, R> = (diff: Partial<T>) => R;
export declare function observe<T extends object>(target: T, label?: string | number): Observed<T, void>;
export declare function observe<T extends object, R>(target: T, update: UpdateFunction<T, R>, label?: string | number): Observed<T, R>;
export {};
//# sourceMappingURL=observe.d.ts.map