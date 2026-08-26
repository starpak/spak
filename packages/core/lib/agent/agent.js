"use strict";
// ===== @spakjs/core Agent SDK - Agent Base Implementation =====
// Agent 基础实现类
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentBase = void 0;
const types_1 = require("./types");
/**
 * Agent 基础实现类
 * 所有 Agent 的基础实现都继承自此类
 */
class AgentBase {
    id;
    name;
    description;
    modelId;
    provider;
    tools;
    status;
    metrics;
    config;
    createdAt;
    updatedAt;
    enabled;
    metadata;
    constructor(config) {
        this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = config.name;
        this.description = config.description;
        this.modelId = config.modelId;
        this.provider = config.provider;
        this.tools = config.tools || [];
        this.enabled = config.enabled ?? true;
        this.metadata = config.metadata;
        // 初始化状态
        this.status = types_1.AgentStatus.IDLE;
        this.createdAt = Date.now();
        this.updatedAt = Date.now();
        // 初始化指标
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            tokenUsage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
            },
            cost: 0,
            lastHeartbeat: Date.now(),
            uptime: 0
        };
        // 保存配置副本
        this.config = {
            maxRetries: config.maxRetries ?? 3,
            temperature: config.temperature ?? 0.7,
            systemPrompt: config.systemPrompt ?? '',
            maxTokens: config.maxTokens ?? 4096,
            timeout: config.timeout ?? 30000,
            ...config
        };
    }
    /**
     * 更新 Agent 配置
     */
    async updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
        this.updatedAt = Date.now();
    }
    /**
     * 更新状态
     */
    setStatus(newStatus) {
        this.status = newStatus;
        this.metrics.lastHeartbeat = Date.now();
    }
    /**
     * 记录请求成功
     */
    recordSuccess(executionTime, tokenUsage, cost) {
        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + executionTime) / this.metrics.totalRequests;
        this.metrics.tokenUsage.promptTokens += tokenUsage.promptTokens;
        this.metrics.tokenUsage.completionTokens += tokenUsage.completionTokens;
        this.metrics.tokenUsage.totalTokens += tokenUsage.totalTokens;
        this.metrics.cost += cost;
    }
    /**
     * 记录请求失败
     */
    recordFailure() {
        this.metrics.totalRequests++;
        this.metrics.failedRequests++;
    }
    /**
     * 计算运行时间
     */
    updateUptime() {
        const now = Date.now();
        this.metrics.uptime = now - this.createdAt;
    }
    /**
     * 检查是否可以执行
     */
    canExecute() {
        return this.enabled && this.status === types_1.AgentStatus.IDLE;
    }
    /**
     * 设置为忙碌状态
     */
    setBusy() {
        this.setStatus(types_1.AgentStatus.BUSY);
    }
    /**
     * 设置为空闲状态
     */
    setIdle() {
        this.setStatus(types_1.AgentStatus.IDLE);
    }
    /**
     * 设置为错误状态
     */
    setError() {
        this.setStatus(types_1.AgentStatus.ERROR);
    }
    /**
     * 设置为崩溃状态
     */
    setCrashed() {
        this.setStatus(types_1.AgentStatus.CRASHED);
    }
    /**
     * 执行 Agent（子类实现）
     */
    async execute(request) {
        throw new Error('execute() must be implemented by subclass');
    }
    /**
     * 公开的执行接口
     */
    async run(request) {
        this.updateUptime();
        if (!this.canExecute()) {
            return {
                agentId: this.id,
                output: `Agent ${this.name} is not available (status: ${this.status})`,
                messages: [],
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                cost: 0,
                executionTime: 0,
                success: false,
                error: `Agent is not available (enabled: ${this.enabled}, status: ${this.status})`
            };
        }
        this.setBusy();
        const startTime = Date.now();
        let response;
        try {
            response = await this.execute(request);
            const executionTime = Date.now() - startTime;
            this.recordSuccess(executionTime, response.usage, response.cost);
            return response;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.recordFailure();
            return {
                agentId: this.id,
                output: '',
                messages: [],
                usage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                cost: 0,
                executionTime: 0,
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
        finally {
            this.setIdle();
        }
    }
}
exports.AgentBase = AgentBase;
//# sourceMappingURL=agent.js.map