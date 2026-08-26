export interface SpakConfig {
    language: string;
    server: {
        host: string;
        port: number;
    };
    plugins: Record<string, any>;
    cpc?: {
        enabled?: boolean;
        sandbox?: {
            enabled?: boolean;
        };
        processIsolation?: {
            enabled?: boolean;
        };
        ssetps?: {
            enabled?: boolean;
            /** Memory limit in MB for SSetPS RSS monitoring; 80% of this trips the warning + circuit breaker. */
            memoryLimitMB?: number;
        };
    };
}
export declare function loadConfig(): SpakConfig;
export declare function saveConfig(config: SpakConfig): void;
export declare function getConfig(key: string): any;
export declare function setConfig(key: string, value: any): SpakConfig;
declare const _default: {
    loadConfig: typeof loadConfig;
    saveConfig: typeof saveConfig;
    getConfig: typeof getConfig;
    setConfig: typeof setConfig;
};
export default _default;
//# sourceMappingURL=index.d.ts.map