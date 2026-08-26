"use strict";
// ===== @spakjs/core Agent SDK - Provider System =====
// Provider 系统实现
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderSystemImpl = void 0;
/**
 * Provider 系统
 * 负责管理 AI Provider 的注册、查询和请求执行
 */
class ProviderSystemImpl {
    providers = new Map();
    providerImplementations = new Map();
    /**
     * 注册 Provider
     */
    async registerProvider(config) {
        if (this.providers.has(config.id)) {
            return false;
        }
        this.providers.set(config.id, config);
        // 这里可以添加 Provider 实现
        // 实际实现中应该支持动态加载 Provider 模块
        this.providerImplementations.set(config.id, this.defaultProviderImplementation);
        return true;
    }
    /**
     * 注销 Provider
     */
    async unregisterProvider(providerId) {
        if (!this.providers.has(providerId)) {
            return false;
        }
        this.providers.delete(providerId);
        this.providerImplementations.delete(providerId);
        return true;
    }
    /**
     * 获取 Provider
     */
    async getProvider(providerId) {
        const config = this.providers.get(providerId);
        if (!config)
            return null;
        return {
            id: config.id,
            name: config.name,
            type: config.type,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            maxTokens: config.maxTokens,
            timeout: config.timeout,
            enabled: config.enabled ?? true,
            metadata: config.metadata
        };
    }
    /**
     * 列出所有 Provider
     */
    async listProviders() {
        return Array.from(this.providers.values()).map(config => ({
            id: config.id,
            name: config.name,
            type: config.type,
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            maxTokens: config.maxTokens,
            timeout: config.timeout,
            enabled: config.enabled ?? true,
            metadata: config.metadata
        }));
    }
    /**
     * 获取 Provider 配置
     */
    async getProviderConfig(providerId) {
        return this.providers.get(providerId) || null;
    }
    /**
     * 执行 Provider 请求
     */
    async executeRequest(providerId, messages) {
        const config = this.providers.get(providerId);
        if (!config) {
            throw new Error(`Provider ${providerId} not found`);
        }
        if (!config.enabled) {
            throw new Error(`Provider ${providerId} is disabled`);
        }
        const providerFunction = this.providerImplementations.get(providerId);
        if (!providerFunction) {
            throw new Error(`Provider implementation not found for ${providerId}`);
        }
        return providerFunction(config, messages);
    }
    /**
     * 检查 Provider 是否已注册
     */
    hasProvider(providerId) {
        return this.providers.has(providerId);
    }
    /**
     * 检查 Provider 是否已启用
     */
    isProviderEnabled(providerId) {
        const config = this.providers.get(providerId);
        return config?.enabled ?? false;
    }
    /**
     * 启用 Provider
     */
    async enableProvider(providerId) {
        const config = this.providers.get(providerId);
        if (!config)
            return false;
        config.enabled = true;
        return true;
    }
    /**
     * 禁用 Provider
     */
    async disableProvider(providerId) {
        const config = this.providers.get(providerId);
        if (!config)
            return false;
        config.enabled = false;
        return true;
    }
    /**
     * 清空所有 Provider
     */
    async clear() {
        this.providers.clear();
        this.providerImplementations.clear();
    }
    /**
     * 默认 Provider 实现（示例）
     */
    async defaultProviderImplementation(config, messages) {
        // 这里可以调用实际的 Provider API
        // 示例：返回模拟响应
        const lastMessage = messages[messages.length - 1];
        return lastMessage
            ? `Response from ${config.name}: ${lastMessage.content}`
            : `Response from ${config.name}`;
    }
}
exports.ProviderSystemImpl = ProviderSystemImpl;
//# sourceMappingURL=provider-system.js.map