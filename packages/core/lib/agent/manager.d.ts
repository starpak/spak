import { Agent, AgentConfig, AgentStatus, AgentMetrics, AgentExecutionRequest, AgentExecutionResponse, AgentManager } from './types';
/**
 * Agent 管理器
 * 负责管理所有 Agent 的创建、查询、更新和执行
 */
export declare class AgentManagerImpl implements AgentManager {
    private agents;
    private agentsByProvider;
    private agentsByTool;
    private metrics;
    /**
     * 创建 Agent
     */
    createAgent(config: AgentConfig): Promise<Agent>;
    /**
     * 获取 Agent
     */
    getAgent(id: string): Promise<Agent | null>;
    /**
     * 列出所有 Agent
     */
    listAgents(): Promise<Agent[]>;
    /**
     * 更新 Agent 配置
     */
    updateAgent(id: string, config: Partial<AgentConfig>): Promise<Agent | null>;
    /**
     * 删除 Agent
     */
    deleteAgent(id: string): Promise<boolean>;
    /**
     * 启用 Agent
     */
    enableAgent(id: string): Promise<boolean>;
    /**
     * 禁用 Agent
     */
    disableAgent(id: string): Promise<boolean>;
    /**
     * 获取 Agent 状态
     */
    getAgentStatus(id: string): Promise<AgentStatus | null>;
    /**
     * 执行 Agent
     */
    executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse>;
    /**
     * 获取 Agent 指标
     */
    getMetrics(id: string): Promise<AgentMetrics | null>;
    /**
     * 列出所有指标
     */
    listMetrics(): Promise<Map<string, AgentMetrics>>;
    /**
     * 获取指定 Provider 的所有 Agent
     */
    getAgentsByProvider(providerId: string): Promise<Agent[]>;
    /**
     * 获取指定工具的所有 Agent
     */
    getAgentsByTool(toolId: string): Promise<Agent[]>;
    /**
     * 获取所有可用的 Agent
     */
    getAvailableAgents(): Promise<Agent[]>;
    /**
     * 清空所有 Agent
     */
    clear(): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map