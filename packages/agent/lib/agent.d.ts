/**
 * Agent core implementation
 * Reimagined from opencode's agent.go for TypeScript/Spak
 */
import type { AgentService, AgentEvent, Attachment, BaseTool, Provider } from './types';
/** Common errors */
export declare class AgentError extends Error {
    code?: string | undefined;
    constructor(message: string, code?: string | undefined);
}
export declare const ErrRequestCancelled: AgentError;
export declare const ErrSessionBusy: AgentError;
/** Agent implementation */
export declare class Agent implements AgentService {
    private tools;
    private provider;
    private sessions;
    private messages;
    private activeRequests;
    private modelId;
    private events;
    constructor(provider: Provider, tools: BaseTool[], initialModelId: string);
    getModel(): string;
    run(sessionId: string, content: string, attachments?: Attachment[]): Promise<AsyncIterable<AgentEvent>>;
    cancel(sessionId: string): void;
    isSessionBusy(sessionId: string): boolean;
    isBusy(): boolean;
    updateModel(modelId: string): Promise<string>;
    summarize(sessionId: string): Promise<void>;
    /** Subscribe to agent events */
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    private emitEvent;
    private executeTools;
    private trackUsage;
    private updateSession;
}
/**
 * Create a new agent instance
 */
export declare function createAgent(provider: Provider, tools: BaseTool[], modelId: string): Agent;
//# sourceMappingURL=agent.d.ts.map