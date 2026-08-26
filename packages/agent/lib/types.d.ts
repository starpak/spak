/**
 * Agent module type definitions
 */
/** Agent event types */
export type AgentEventType = 'error' | 'response' | 'summarize';
/** Agent event structure */
export interface AgentEvent {
    type: AgentEventType;
    message?: AgentMessage;
    error?: Error;
    sessionId?: string;
    progress?: string;
    done?: boolean;
}
/** Agent message structure */
export interface AgentMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: ToolCall[];
    finishReason?: FinishReason;
    model?: string;
    timestamp?: number;
}
/** Tool call definition */
export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, any>;
}
/** Finish reasons for agent responses */
export type FinishReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop' | 'canceled' | 'permission_denied' | 'error';
/** Token usage tracking */
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
}
/** Agent configuration */
export interface AgentConfig {
    /** Agent identifier/name */
    name: string;
    /** Model ID to use */
    modelId: string;
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Reasoning effort level (for reasoning models) */
    reasoningEffort?: 'low' | 'medium' | 'high';
    /** System prompt override */
    systemPrompt?: string;
    /** Enabled tools */
    tools?: string[];
}
/** Agent service interface */
export interface AgentService {
    /** Get the current model ID */
    getModel(): string;
    /** Run the agent with given content */
    run(sessionId: string, content: string, attachments?: Attachment[]): Promise<AsyncIterable<AgentEvent>>;
    /** Cancel a running session */
    cancel(sessionId: string): void;
    /** Check if a session is busy */
    isSessionBusy(sessionId: string): boolean;
    /** Check if any session is busy */
    isBusy(): boolean;
    /** Update the agent's model */
    updateModel(modelId: string): Promise<string>;
    /** Summarize a session */
    summarize(sessionId: string): Promise<void>;
}
/** Attachment for messages */
export interface Attachment {
    filePath: string;
    mimeType: string;
    content?: Buffer;
}
/** Tool result */
export interface ToolResult {
    toolCallId: string;
    content: string;
    metadata?: Record<string, any>;
    isError?: boolean;
}
/** Base tool interface */
export interface BaseTool {
    info: ToolInfo;
    run(ctx: any, call: ToolCall): Promise<ToolResult>;
}
/** Tool information */
export interface ToolInfo {
    name: string;
    description: string;
    parameters: Record<string, any>;
}
/** Provider event types */
export type ProviderEventType = 'thinking_delta' | 'content_delta' | 'tool_use_start' | 'tool_use_delta' | 'tool_use_stop' | 'error' | 'complete';
/** Provider event */
export interface ProviderEvent {
    type: ProviderEventType;
    content?: string;
    toolCall?: ToolCall;
    response?: {
        toolCalls: ToolCall[];
        finishReason: FinishReason;
        usage: TokenUsage;
    };
    error?: Error;
}
/** LLM Provider interface */
export interface Provider {
    model(): ModelInfo;
    streamResponse(ctx: any, messages: AgentMessage[], tools: BaseTool[]): AsyncIterable<ProviderEvent>;
    sendMessages(ctx: any, messages: AgentMessage[], tools: BaseTool[]): Promise<{
        content: string;
        usage: TokenUsage;
    }>;
}
/** Model information */
export interface ModelInfo {
    id: string;
    provider: string;
    supportsAttachments: boolean;
    canReason: boolean;
    defaultMaxTokens: number;
    costPer1MIn: number;
    costPer1MOut: number;
    costPer1MInCached?: number;
    costPer1MOutCached?: number;
}
/** Session data */
export interface Session {
    id: string;
    title?: string;
    createdAt: number;
    updatedAt: number;
    completionTokens: number;
    promptTokens: number;
    cost: number;
    summaryMessageId?: string;
}
//# sourceMappingURL=types.d.ts.map