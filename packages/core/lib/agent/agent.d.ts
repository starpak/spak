import { Agent, AgentConfig, AgentStatus, AgentMetrics, AgentExecutionRequest, AgentExecutionResponse } from './types';
/**
 * Agent 基础实现类
 * 所有 Agent 的基础实现都继承自此类
 */
export declare class AgentBase implements Agent {
    id: string;
    name: string;
    description?: string;
    modelId: string;
    provider: string;
    tools: string[];
    status: AgentStatus;
    metrics: AgentMetrics;
    config: AgentConfig;
    createdAt: number;
    updatedAt: number;
    enabled: boolean;
    metadata?: Record<string, any>;
    constructor(config: AgentConfig);
    /**
     * 更新 Agent 配置
     */
    updateConfig(newConfig: Partial<AgentConfig>): Promise<void>;
    /**
     * 更新状态
     */
    protected setStatus(newStatus: AgentStatus): void;
    /**
     * 记录请求成功
     */
    protected recordSuccess(executionTime: number, tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }, cost: number): void;
    /**
     * 记录请求失败
     */
    protected recordFailure(): void;
    /**
     * 计算运行时间
     */
    protected updateUptime(): void;
    /**
     * 检查是否可以执行
     */
    protected canExecute(): boolean;
    /**
     * 设置为忙碌状态
     */
    protected setBusy(): void;
    /**
     * 设置为空闲状态
     */
    protected setIdle(): void;
    /**
     * 设置为错误状态
     */
    protected setError(): void;
    /**
     * 设置为崩溃状态
     */
    protected setCrashed(): void;
    /**
     * 执行 Agent（子类实现）
     */
    protected execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse>;
    /**
     * 公开的执行接口
     */
    run(request: AgentExecutionRequest): Promise<AgentExecutionResponse>;
}
//# sourceMappingURL=agent.d.ts.map