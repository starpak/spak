// ===== @spakjs/core Agent SDK - Agent Base Implementation =====
// Agent 基础实现类

import {
  Agent,
  AgentConfig,
  AgentStatus,
  AgentMetrics,
  Message,
  ToolCall,
  AgentExecutionRequest,
  AgentExecutionResponse
} from './types'

/**
 * Agent 基础实现类
 * 所有 Agent 的基础实现都继承自此类
 */
export class AgentBase implements Agent {
  id: string
  name: string
  description?: string
  modelId: string
  provider: string
  tools: string[]
  status: AgentStatus
  metrics: AgentMetrics
  config: AgentConfig
  createdAt: number
  updatedAt: number
  enabled: boolean
  metadata?: Record<string, any>

  constructor(config: AgentConfig) {
    this.id = config.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.name = config.name
    this.description = config.description
    this.modelId = config.modelId
    this.provider = config.provider
    this.tools = config.tools || []
    this.enabled = config.enabled ?? true
    this.metadata = config.metadata

    // 初始化状态
    this.status = AgentStatus.IDLE
    this.createdAt = Date.now()
    this.updatedAt = Date.now()

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
    }

    // 保存配置副本
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      temperature: config.temperature ?? 0.7,
      systemPrompt: config.systemPrompt ?? '',
      maxTokens: config.maxTokens ?? 4096,
      timeout: config.timeout ?? 30000,
      ...config
    }
  }

  /**
   * 更新 Agent 配置
   */
  async updateConfig(newConfig: Partial<AgentConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...newConfig
    }
    this.updatedAt = Date.now()
  }

  /**
   * 更新状态
   */
  protected setStatus(newStatus: AgentStatus): void {
    this.status = newStatus
    this.metrics.lastHeartbeat = Date.now()
  }

  /**
   * 记录请求成功
   */
  protected recordSuccess(executionTime: number, tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number }, cost: number): void {
    this.metrics.totalRequests++
    this.metrics.successfulRequests++
    this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + executionTime) / this.metrics.totalRequests
    this.metrics.tokenUsage.promptTokens += tokenUsage.promptTokens
    this.metrics.tokenUsage.completionTokens += tokenUsage.completionTokens
    this.metrics.tokenUsage.totalTokens += tokenUsage.totalTokens
    this.metrics.cost += cost
  }

  /**
   * 记录请求失败
   */
  protected recordFailure(): void {
    this.metrics.totalRequests++
    this.metrics.failedRequests++
  }

  /**
   * 计算运行时间
   */
  protected updateUptime(): void {
    const now = Date.now()
    this.metrics.uptime = now - this.createdAt
  }

  /**
   * 检查是否可以执行
   */
  protected canExecute(): boolean {
    return this.enabled && this.status === AgentStatus.IDLE
  }

  /**
   * 设置为忙碌状态
   */
  protected setBusy(): void {
    this.setStatus(AgentStatus.BUSY)
  }

  /**
   * 设置为空闲状态
   */
  protected setIdle(): void {
    this.setStatus(AgentStatus.IDLE)
  }

  /**
   * 设置为错误状态
   */
  protected setError(): void {
    this.setStatus(AgentStatus.ERROR)
  }

  /**
   * 设置为崩溃状态
   */
  protected setCrashed(): void {
    this.setStatus(AgentStatus.CRASHED)
  }

  /**
   * 执行 Agent（子类实现）
   */
  protected async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    throw new Error('execute() must be implemented by subclass')
  }

  /**
   * 公开的执行接口
   */
  async run(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    this.updateUptime()

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
      }
    }

    this.setBusy()

    const startTime = Date.now()
    let response: AgentExecutionResponse

    try {
      response = await this.execute(request)
      const executionTime = Date.now() - startTime

      this.recordSuccess(executionTime, response.usage, response.cost)

      return response
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.recordFailure()

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
      }
    } finally {
      this.setIdle()
    }
  }
}
