/**
 * Agent 状态枚举
 */
export declare enum AgentStatus {
    IDLE = "idle",
    BUSY = "busy",
    ERROR = "error",
    STOPPED = "stopped",
    CRASHED = "crashed"
}
/**
 * Agent 指标接口
 */
export interface AgentMetrics {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    lastHeartbeat: number;
    uptime: number;
}
/**
 * Agent 配置接口
 */
export interface AgentConfig {
    id?: string;
    name: string;
    description?: string;
    modelId: string;
    provider: string;
    tools?: string[];
    maxRetries?: number;
    temperature?: number;
    systemPrompt?: string;
    maxTokens?: number;
    timeout?: number;
    enabled?: boolean;
    metadata?: Record<string, any>;
}
/**
 * Agent 完整信息
 */
export interface Agent {
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
}
/**
 * 工具配置接口
 */
export interface ToolConfig {
    id: string;
    name: string;
    description?: string;
    category?: string;
    parameters?: Record<string, any>;
    permissions?: string[];
    enabled?: boolean;
    metadata?: Record<string, any>;
}
/**
 * 工具执行结果
 */
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    executionTime?: number;
    metadata?: Record<string, any>;
}
/**
 * Provider 配置接口
 */
export interface ProviderConfig {
    id: string;
    name: string;
    type: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    timeout?: number;
    enabled?: boolean;
    metadata?: Record<string, any>;
}
/**
 * Provider 完整信息
 */
export interface Provider {
    id: string;
    name: string;
    type: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    timeout?: number;
    enabled: boolean;
    metadata?: Record<string, any>;
}
/**
 * Agent 模板接口
 */
export interface AgentTemplate {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    category?: string;
    config: Partial<AgentConfig>;
    tools?: string[];
    provider?: string;
    createdAt: number;
    updatedAt: number;
}
/**
 * 工具执行参数
 */
export interface ToolExecutionParams {
    agentId: string;
    toolId: string;
    params: Record<string, any>;
    context?: Record<string, any>;
}
/**
 * 消息接口
 */
export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    timestamp: number;
    metadata?: Record<string, any>;
}
/**
 * Tool Call 接口
 */
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}
/**
 * Agent 执行请求
 */
export interface AgentExecutionRequest {
    agentId: string;
    input: string;
    messages?: Message[];
    context?: Record<string, any>;
    maxRetries?: number;
    stream?: boolean;
}
/**
 * Agent 执行响应
 */
export interface AgentExecutionResponse {
    agentId: string;
    output: string;
    messages: Message[];
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
    executionTime: number;
    success: boolean;
    error?: string;
}
/**
 * Agent 管理器接口
 */
export interface AgentManager {
    createAgent(config: AgentConfig): Promise<Agent>;
    getAgent(id: string): Promise<Agent | null>;
    listAgents(): Promise<Agent[]>;
    updateAgent(id: string, config: Partial<AgentConfig>): Promise<Agent | null>;
    deleteAgent(id: string): Promise<boolean>;
    enableAgent(id: string): Promise<boolean>;
    disableAgent(id: string): Promise<boolean>;
    getAgentStatus(id: string): Promise<AgentStatus | null>;
    executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse>;
    getMetrics(id: string): Promise<AgentMetrics | null>;
    listMetrics(): Promise<Map<string, AgentMetrics>>;
}
/**
 * 工具系统接口
 */
export interface ToolSystem {
    registerTool(config: ToolConfig): Promise<boolean>;
    unregisterTool(toolId: string): Promise<boolean>;
    getTool(toolId: string): Promise<ToolConfig | null>;
    listTools(): Promise<ToolConfig[]>;
    executeTool(params: ToolExecutionParams): Promise<ToolResult>;
    getToolPermissions(toolId: string): Promise<string[]>;
}
/**
 * Provider 系统接口
 */
export interface ProviderSystem {
    registerProvider(config: ProviderConfig): Promise<boolean>;
    unregisterProvider(providerId: string): Promise<boolean>;
    getProvider(providerId: string): Promise<Provider | null>;
    listProviders(): Promise<Provider[]>;
    getProviderConfig(providerId: string): Promise<ProviderConfig | null>;
    executeRequest(providerId: string, messages: Message[]): Promise<string>;
}
export { AgentManagerImpl } from './manager';
export { ToolSystemImpl, ToolFunction } from './tool-system';
export { ProviderSystemImpl, ProviderFunction } from './provider-system';
export { AgentTemplateManagerImpl } from './template-manager';
//# sourceMappingURL=types.d.ts.map