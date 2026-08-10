/**
 * Agent core implementation
 * Reimagined from opencode's agent.go for TypeScript/Spak
 */

import { EventEmitter } from 'events'
import { createLogger } from '@spakjs/log'
import type {
  AgentService,
  AgentEvent,
  AgentMessage,
  Attachment,
  ToolCall,
  ToolResult,
  BaseTool,
  Provider,
  ProviderEvent,
  TokenUsage,
  Session,
  FinishReason,
} from './types'

const logger = createLogger('agent')

/** Common errors */
export class AgentError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'AgentError'
  }
}

export const ErrRequestCancelled = new AgentError('Request cancelled by user', 'CANCELLED')
export const ErrSessionBusy = new AgentError('Session is currently processing another request', 'BUSY')

/** Agent implementation */
export class Agent implements AgentService {
  private tools: BaseTool[]
  private provider: Provider
  private sessions: Map<string, Session>
  private messages: Map<string, AgentMessage[]>
  private activeRequests: Map<string, AbortController>
  private modelId: string
  
  // Event emitter for pub/sub pattern
  private events: EventEmitter
  
  constructor(
    provider: Provider,
    tools: BaseTool[],
    initialModelId: string
  ) {
    this.provider = provider
    this.tools = tools
    this.modelId = initialModelId
    this.sessions = new Map()
    this.messages = new Map()
    this.activeRequests = new Map()
    this.events = new EventEmitter()
  }
  
  getModel(): string {
    return this.modelId
  }
  
  async run(
    sessionId: string,
    content: string,
    attachments?: Attachment[]
  ): Promise<AsyncIterable<AgentEvent>> {
    const controller = new AbortController()
    this.activeRequests.set(sessionId, controller)
    
    const eventQueue: AgentEvent[] = []
    let resolveWait: (() => void) | null = null
    const waitPromise = new Promise<void>(resolve => { resolveWait = resolve })
    
    // Initialize session if needed
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completionTokens: 0,
        promptTokens: 0,
        cost: 0,
      })
      this.messages.set(sessionId, [])
    }
    
    const processGeneration = async () => {
      try {
        const signal = controller.signal
        
        // Get message history
        const msgHistory = this.messages.get(sessionId) || []
        
        // Create user message
        const userMsg: AgentMessage = {
          role: 'user',
          content,
          timestamp: Date.now(),
        }
        msgHistory.push(userMsg)
        
        // Stream response from provider
        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: '',
          toolCalls: [],
          model: this.modelId,
          timestamp: Date.now(),
        }
        
        for await (const event of this.provider.streamResponse(signal as any, msgHistory, this.tools)) {
          if (signal.aborted) {
            assistantMsg.finishReason = 'canceled'
            break
          }
          
          switch (event.type) {
            case 'thinking_delta':
              // Handle thinking/reasoning content
              break
            case 'content_delta':
              if (event.content) {
                assistantMsg.content += event.content
              }
              break
            case 'tool_use_start':
              if (event.toolCall) {
                assistantMsg.toolCalls?.push(event.toolCall)
              }
              break
            case 'tool_use_stop':
              // Tool call complete
              break
            case 'error':
              this.emitEvent({
                type: 'error',
                error: event.error,
                sessionId,
                done: true,
              })
              return
            case 'complete':
              if (event.response) {
                assistantMsg.toolCalls = event.response.toolCalls
                assistantMsg.finishReason = event.response.finishReason
                await this.trackUsage(sessionId, event.response.usage)
              }
              break
          }
        }
        
        // Handle tool calls if any
        if (assistantMsg.toolCalls && assistantMsg.toolCalls.length > 0) {
          const toolResults = await this.executeTools(sessionId, assistantMsg.toolCalls, signal)
          
          if (assistantMsg.finishReason === 'tool_use' && toolResults) {
            // Add tool results to history and continue
            const toolMsg: AgentMessage = {
              role: 'tool',
              content: toolResults.map(r => r.content).join('\n'),
              timestamp: Date.now(),
            }
            msgHistory.push(assistantMsg, toolMsg)
            
            // Recursively process next turn
            await processGeneration()
            return
          }
        }
        
        // Save assistant message
        msgHistory.push(assistantMsg)
        this.updateSession(sessionId)
        
        // Emit response event
        this.emitEvent({
          type: 'response',
          message: assistantMsg,
          sessionId,
          done: true,
        })
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          this.emitEvent({
            type: 'error',
            error: ErrRequestCancelled,
            sessionId,
            done: true,
          })
        } else {
          this.emitEvent({
            type: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
            sessionId,
            done: true,
          })
        }
      } finally {
        this.activeRequests.delete(sessionId)
        if (resolveWait) resolveWait()
      }
    }
    
    // Start processing in background
    processGeneration()
    
    // Return async iterable
    return {
      [Symbol.asyncIterator]() {
        return {
          index: 0,
          queue: eventQueue,
          waitPromise,
          resolveWait: null as (() => void) | null,
          
          async next() {
            if (this.index < this.queue.length) {
              return { value: this.queue[this.index++], done: false }
            }
            // Wait for more events or completion
            await this.waitPromise
            if (this.index < this.queue.length) {
              return { value: this.queue[this.index++], done: false }
            }
            return { value: undefined, done: true }
          },
        }
      },
    }
  }
  
  cancel(sessionId: string): void {
    const controller = this.activeRequests.get(sessionId)
    if (controller) {
      logger.info(`Cancelling request for session: ${sessionId}`)
      controller.abort()
      this.activeRequests.delete(sessionId)
    }
    
    // Also check for summarize requests
    const summarizeKey = `${sessionId}-summarize`
    const summarizeController = this.activeRequests.get(summarizeKey)
    if (summarizeController) {
      logger.info(`Cancelling summarize for session: ${sessionId}`)
      summarizeController.abort()
      this.activeRequests.delete(summarizeKey)
    }
  }
  
  isSessionBusy(sessionId: string): boolean {
    return this.activeRequests.has(sessionId) || this.activeRequests.has(`${sessionId}-summarize`)
  }
  
  isBusy(): boolean {
    return this.activeRequests.size > 0
  }
  
  async updateModel(modelId: string): Promise<string> {
    if (this.isBusy()) {
      throw new AgentError('Cannot change model while processing requests', 'BUSY')
    }
    this.modelId = modelId
    return modelId
  }
  
  async summarize(sessionId: string): Promise<void> {
    if (this.isSessionBusy(sessionId)) {
      throw ErrSessionBusy
    }
    
    const controller = new AbortController()
    this.activeRequests.set(`${sessionId}-summarize`, controller)
    
    try {
      const msgHistory = this.messages.get(sessionId) || []
      
      if (msgHistory.length === 0) {
        throw new AgentError('No messages to summarize', 'EMPTY')
      }
      
      this.emitEvent({
        type: 'summarize',
        sessionId,
        progress: 'Analyzing conversation...',
      })
      
      // Create summary prompt
      const summaryPrompt: AgentMessage = {
        role: 'user',
        content: 'Provide a detailed but concise summary of our conversation above. Focus on information that would be helpful for continuing the conversation, including what we did, what we are doing, which files we are working on, and what we are going to do next.',
        timestamp: Date.now(),
      }
      
      const response = await this.provider.sendMessages(
        controller.signal as any,
        [...msgHistory, summaryPrompt],
        []
      )
      
      const summary = response.content.trim()
      if (!summary) {
        throw new AgentError('Empty summary returned', 'EMPTY')
      }
      
      // Create summary message
      const summaryMsg: AgentMessage = {
        role: 'assistant',
        content: summary,
        finishReason: 'end_turn',
        model: this.modelId,
        timestamp: Date.now(),
      }
      
      // Update session with summary reference
      const session = this.sessions.get(sessionId)
      if (session) {
        session.summaryMessageId = `summary-${Date.now()}`
        session.completionTokens = response.usage.outputTokens
        session.promptTokens = response.usage.inputTokens
        await this.trackUsage(sessionId, response.usage)
      }
      
      msgHistory.push(summaryMsg)
      
      this.emitEvent({
        type: 'summarize',
        sessionId,
        progress: 'Summary complete',
        done: true,
      })
      
    } catch (error) {
      this.emitEvent({
        type: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        sessionId,
        done: true,
      })
      throw error
    } finally {
      this.activeRequests.delete(`${sessionId}-summarize`)
    }
  }
  
  /** Subscribe to agent events */
  on(event: string, listener: (...args: any[]) => void): this {
    this.events.on(event, listener)
    return this
  }
  
  off(event: string, listener: (...args: any[]) => void): this {
    this.events.off(event, listener)
    return this
  }
  
  private emitEvent(event: AgentEvent): void {
    this.events.emit('agent-event', event)
  }
  
  private async executeTools(
    sessionId: string,
    toolCalls: ToolCall[],
    signal: AbortSignal
  ): Promise<ToolResult[] | null> {
    const results: ToolResult[] = []
    
    for (let i = 0; i < toolCalls.length; i++) {
      if (signal.aborted) {
        // Mark remaining tool calls as canceled
        for (let j = i; j < toolCalls.length; j++) {
          results.push({
            toolCallId: toolCalls[j].id,
            content: 'Tool execution canceled by user',
            isError: true,
          })
        }
        return results
      }
      
      const toolCall = toolCalls[i]
      const tool = this.tools.find(t => t.info.name === toolCall.name)
      
      if (!tool) {
        results.push({
          toolCallId: toolCall.id,
          content: `Tool not found: ${toolCall.name}`,
          isError: true,
        })
        continue
      }
      
      try {
        const result = await tool.run({ sessionId, signal }, toolCall)
        results.push(result)
      } catch (error) {
        results.push({
          toolCallId: toolCall.id,
          content: error instanceof Error ? error.message : String(error),
          isError: true,
        })
      }
    }
    
    return results.length > 0 ? results : null
  }
  
  private async trackUsage(sessionId: string, usage: TokenUsage): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    const model = this.provider.model()
    const cost = 
      ((model.costPer1MInCached || 0) / 1e6) * (usage.cacheCreationTokens || 0) +
      ((model.costPer1MOutCached || 0) / 1e6) * (usage.cacheReadTokens || 0) +
      (model.costPer1MIn / 1e6) * usage.inputTokens +
      (model.costPer1MOut / 1e6) * usage.outputTokens
    
    session.cost += cost
    session.completionTokens = usage.outputTokens + (usage.cacheReadTokens || 0)
    session.promptTokens = usage.inputTokens + (usage.cacheCreationTokens || 0)
    session.updatedAt = Date.now()
    
    this.sessions.set(sessionId, session)
  }
  
  private updateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.updatedAt = Date.now()
      this.sessions.set(sessionId, session)
    }
  }
}

/**
 * Create a new agent instance
 */
export function createAgent(
  provider: Provider,
  tools: BaseTool[],
  modelId: string
): Agent {
  return new Agent(provider, tools, modelId)
}
