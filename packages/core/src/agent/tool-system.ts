// ===== @spakjs/core Agent SDK - Tool System =====
// 工具系统实现

import {
  ToolConfig,
  ToolResult,
  ToolExecutionParams,
  ToolSystem
} from './types'

/**
 * 工具系统
 * 负责注册、查询和执行工具
 */
export class ToolSystemImpl implements ToolSystem {
  private tools: Map<string, ToolConfig> = new Map()
  private toolImplementations: Map<string, ToolFunction> = new Map()

  /**
   * 注册工具
   */
  async registerTool(config: ToolConfig): Promise<boolean> {
    if (this.tools.has(config.id)) {
      return false
    }

    this.tools.set(config.id, config)

    // 这里可以添加工具实现
    // 实际实现中应该支持动态加载工具模块
    this.toolImplementations.set(config.id, this.defaultToolImplementation)

    return true
  }

  /**
   * 注销工具
   */
  async unregisterTool(toolId: string): Promise<boolean> {
    if (!this.tools.has(toolId)) {
      return false
    }

    this.tools.delete(toolId)
    this.toolImplementations.delete(toolId)

    return true
  }

  /**
   * 获取工具配置
   */
  async getTool(toolId: string): Promise<ToolConfig | null> {
    return this.tools.get(toolId) || null
  }

  /**
   * 列出所有工具
   */
  async listTools(): Promise<ToolConfig[]> {
    return Array.from(this.tools.values())
  }

  /**
   * 执行工具
   */
  async executeTool(params: ToolExecutionParams): Promise<ToolResult> {
    const { agentId, toolId, params: toolParams, context } = params

    const tool = this.tools.get(toolId)
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolId} not found`
      }
    }

    if (!tool.enabled) {
      return {
        success: false,
        error: `Tool ${toolId} is disabled`
      }
    }

    const startTime = Date.now()

    try {
      const toolFunction = this.toolImplementations.get(toolId)
      if (!toolFunction) {
        return {
          success: false,
          error: `Tool implementation not found for ${toolId}`
        }
      }

      const result = await toolFunction(toolParams, context)

      const executionTime = Date.now() - startTime

      return {
        success: true,
        data: result,
        executionTime,
        metadata: {
          toolId,
          agentId,
          executedAt: Date.now()
        }
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        metadata: {
          toolId,
          agentId,
          executedAt: Date.now()
        }
      }
    }
  }

  /**
   * 获取工具权限
   */
  async getToolPermissions(toolId: string): Promise<string[]> {
    const tool = this.tools.get(toolId)
    return tool?.permissions || []
  }

  /**
   * 检查工具是否已注册
   */
  hasTool(toolId: string): boolean {
    return this.tools.has(toolId)
  }

  /**
   * 检查工具是否已启用
   */
  isToolEnabled(toolId: string): boolean {
    const tool = this.tools.get(toolId)
    return tool?.enabled ?? false
  }

  /**
   * 启用工具
   */
  async enableTool(toolId: string): Promise<boolean> {
    const tool = this.tools.get(toolId)
    if (!tool) return false

    tool.enabled = true
    return true
  }

  /**
   * 禁用工具
   */
  async disableTool(toolId: string): Promise<boolean> {
    const tool = this.tools.get(toolId)
    if (!tool) return false

    tool.enabled = false
    return true
  }

  /**
   * 默认工具实现（示例）
   */
  private async defaultToolImplementation(
    params: Record<string, any>,
    context?: Record<string, any>
  ): Promise<any> {
    // 这里可以调用实际的工具实现
    // 示例：返回参数信息
    return {
      message: 'Tool executed successfully',
      parameters: params,
      context: context || {}
    }
  }

  /**
   * 清空所有工具
   */
  async clear(): Promise<void> {
    this.tools.clear()
    this.toolImplementations.clear()
  }
}

/**
 * 工具函数类型
 */
export type ToolFunction = (
  params: Record<string, any>,
  context?: Record<string, any>
) => Promise<any>
