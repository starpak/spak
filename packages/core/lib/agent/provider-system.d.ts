import { Provider, ProviderConfig, ProviderSystem, Message } from './types';
/**
 * Provider 系统
 * 负责管理 AI Provider 的注册、查询和请求执行
 */
export declare class ProviderSystemImpl implements ProviderSystem {
    private providers;
    private providerImplementations;
    /**
     * 注册 Provider
     */
    registerProvider(config: ProviderConfig): Promise<boolean>;
    /**
     * 注销 Provider
     */
    unregisterProvider(providerId: string): Promise<boolean>;
    /**
     * 获取 Provider
     */
    getProvider(providerId: string): Promise<Provider | null>;
    /**
     * 列出所有 Provider
     */
    listProviders(): Promise<Provider[]>;
    /**
     * 获取 Provider 配置
     */
    getProviderConfig(providerId: string): Promise<ProviderConfig | null>;
    /**
     * 执行 Provider 请求
     */
    executeRequest(providerId: string, messages: Message[]): Promise<string>;
    /**
     * 检查 Provider 是否已注册
     */
    hasProvider(providerId: string): boolean;
    /**
     * 检查 Provider 是否已启用
     */
    isProviderEnabled(providerId: string): boolean;
    /**
     * 启用 Provider
     */
    enableProvider(providerId: string): Promise<boolean>;
    /**
     * 禁用 Provider
     */
    disableProvider(providerId: string): Promise<boolean>;
    /**
     * 清空所有 Provider
     */
    clear(): Promise<void>;
    /**
     * 默认 Provider 实现（示例）
     */
    private defaultProviderImplementation;
}
/**
 * Provider 函数类型
 */
export type ProviderFunction = (config: ProviderConfig, messages: Message[]) => Promise<string>;
//# sourceMappingURL=provider-system.d.ts.map