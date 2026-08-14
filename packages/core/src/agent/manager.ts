// ===== @spakjs/core Agent SDK - Agent Manager =====
// Agent 管理器实现

import {
  Agent,
  AgentConfig,
  AgentStatus,
  AgentMetrics,
  AgentExecutionRequest,
  AgentExecutionResponse,
  AgentManager,
  Message
} from './types'
import { AgentBase } from './agent'

/**
 * Agent 管理器
 * 负责管理所有 Agent 的创建、查询、更新和执行
 */
export class AgentManagerImpl implements AgentManager {
  private agents: Map<string, AgentBase> = new Map()
  private agentsByProvider: Map<string, Set<string>> = new Map()
  private agentsByTool: Map<string, Set<string>> = new Map()
  private metrics: Map<string, AgentMetrics> = new Map()

  /**
   * 创建 Agent
   */
  async createAgent(config: AgentConfig): Promise<Agent> {
    const agent = new AgentBase(config)
    this.agents.set(agent.id, agent)

    // 按Provider索引
    if (!this.agentsByProvider.has(agent.provider)) {
      this.agentsByProvider.set(agent.provider, new Set())
    }
    this.agentsByProvider.get(agent.provider)!.add(agent.id)

    // 按工具索引
    for (const toolId of agent.tools) {
      if (!this.agentsByTool.has(toolId)) {
        this.agentsByTool.set(toolId, new Set())
      }
      this.agentsByTool.get(toolId)!.add(agent.id)
    }

    // 记录指标
    this.metrics.set(agent.id, agent.metrics)

    return agent as Agent
  }

  /**
   * 获取 Agent
   */
  async getAgent(id: string): Promise<Agent | null> {
    const agent = this.agents.get(id)
    return agent ? (agent as Agent) : null
  }

  /**
   * 列出所有 Agent
   */
  async listAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).map(agent => agent as Agent)
  }

  /**
   * 更新 Agent 配置
   */
  async updateAgent(id: string, config: Partial<AgentConfig>): Promise<Agent | null> {
    const agent = this.agents.get(id)
    if (!agent) return null

    await agent.updateConfig(config)
    return agent as Agent
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id)
    if (!agent) return false

    // 从 Provider 索引中移除
    const providerAgents = this.agentsByProvider.get(agent.provider)
    if (providerAgents) {
      providerAgents.delete(id)
      if (providerAgents.size === 0) {
        this.agentsByProvider.delete(agent.provider)
      }
    }

    // 从工具索引中移除
    for (const toolId of agent.tools) {
      const toolAgents = this.agentsByTool.get(toolId)
      if (toolAgents) {
        toolAgents.delete(id)
        if (toolAgents.size === 0) {
          this.agentsByTool.delete(toolId)
        }
      }
    }

    this.agents.delete(id)
    this.metrics.delete(id)

    return true
  }

  /**
   * 启用 Agent
   */
  async enableAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id)
    if (!agent) return false

    await agent.updateConfig({ enabled: true })
    return true
  }

  /**
   * 禁用 Agent
   */
  async disableAgent(id: string): Promise<boolean> {
    const agent = this.agents.get(id)
    if (!agent) return false

    await agent.updateConfig({ enabled: false })
    return true
  }

  /**
   * 获取 Agent 状态
   */
  async getAgentStatus(id: string): Promise<AgentStatus | null> {
    const agent = this.agents.get(id)
    return agent ? agent.status : null
  }

  /**
   * 执行 Agent
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const agent = this.agents.get(request.agentId)
    if (!agent) {
      return {
        agentId: request.agentId,
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
        error: `Agent ${request.agentId} not found`
      }
    }

    return agent.run(request)
  }

  /**
   * 获取 Agent 指标
   */
  async getMetrics(id: string): Promise<AgentMetrics | null> {
    return this.metrics.get(id) || null
  }

  /**
   * 列出所有指标
   */
  async listMetrics(): Promise<Map<string, AgentMetrics>> {
    return new Map(this.metrics)
  }

  /**
   * 获取指定 Provider 的所有 Agent
   */
  async getAgentsByProvider(providerId: string): Promise<Agent[]> {
    const agentIds = this.agentsByProvider.get(providerId)
    if (!agentIds) return []

    const agents: Agent[] = []
    for (const id of agentIds) {
      const agent = this.agents.get(id)
      if (agent) {
        agents.push(agent as Agent)
      }
    }
    return agents
  }

  /**
   * 获取指定工具的所有 Agent
   */
  async getAgentsByTool(toolId: string): Promise<Agent[]> {
    const agentIds = this.agentsByTool.get(toolId)
    if (!agentIds) return []

    const agents: Agent[] = []
    for (const id of agentIds) {
      const agent = this.agents.get(id)
      if (agent) {
        agents.push(agent as Agent)
      }
    }
    return agents
  }

  /**
   * 获取所有可用的 Agent
   */
  async getAvailableAgents(): Promise<Agent[]> {
    const agents: Agent[] = []
    for (const agent of this.agents.values()) {
      if (agent.enabled && agent.status === AgentStatus.IDLE) {
        agents.push(agent as Agent)
      }
    }
    return agents
  }

  /**
   * 清空所有 Agent
   */
  async clear(): Promise<void> {
    this.agents.clear()
    this.agentsByProvider.clear()
    this.agentsByTool.clear()
    this.metrics.clear()
  }
}
