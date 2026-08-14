# @spakjs/core Agent SDK

> 企业级 AI Agent 开发框架

## 📖 概述

Agent SDK 是 Spak 框架的核心模块，提供完整的 Agent 开发、管理和执行能力。

## ✨ 核心功能

### 1. Agent 管理

- ✅ 创建、查询、更新、删除 Agent
- ✅ 启用/禁用 Agent
- ✅ 状态监控
- ✅ 指标收集

### 2. 工具系统

- ✅ 注册、查询、执行工具
- ✅ 工具权限控制
- ✅ 工具分类管理

### 3. Provider 系统

- ✅ 支持 OpenAI、Anthropic、Google 等 LLM Provider
- ✅ Provider 配置管理
- ✅ 统一请求接口

### 4. 模板系统

- ✅ 预定义 Agent 模板
- ✅ 模板分类管理
- ✅ 快速创建 Agent

## 🚀 快速开始

### 安装

```bash
pnpm add @spakjs/core
```

### 基本使用

```typescript
import {
  AgentConfig,
  AgentManager,
  AgentManagerImpl,
  AgentExecutionRequest
} from '@spakjs/core'

// 创建 Agent 管理器
const manager = new AgentManagerImpl()

// 创建 Agent
const config: AgentConfig = {
  name: 'My Assistant',
  modelId: 'gpt-4',
  provider: 'openai',
  tools: ['web_search'],
  systemPrompt: '你是一个有用的助手'
}

const agent = await manager.createAgent(config)

// 执行 Agent
const request: AgentExecutionRequest = {
  agentId: agent.id,
  input: '你好，请介绍一下自己'
}

const response = await manager.executeAgent(request)
console.log(response.output)
```

## 📚 API 文档

### AgentManager

#### 方法

- `createAgent(config)`: 创建 Agent
- `getAgent(id)`: 获取 Agent
- `listAgents()`: 列出所有 Agent
- `updateAgent(id, config)`: 更新 Agent
- `deleteAgent(id)`: 删除 Agent
- `enableAgent(id)`: 启用 Agent
- `disableAgent(id)`: 禁用 Agent
- `executeAgent(request)`: 执行 Agent
- `getMetrics(id)`: 获取指标
- `listMetrics()`: 列出所有指标

### ToolSystem

#### 方法

- `registerTool(config)`: 注册工具
- `getTool(toolId)`: 获取工具
- `listTools()`: 列出所有工具
- `executeTool(params)`: 执行工具
- `getToolPermissions(toolId)`: 获取工具权限

### ProviderSystem

#### 方法

- `registerProvider(config)`: 注册 Provider
- `getProvider(providerId)`: 获取 Provider
- `listProviders()`: 列出所有 Provider
- `executeRequest(providerId, messages)`: 执行请求

### AgentTemplateManager

#### 方法

- `createTemplate(template)`: 创建模板
- `getTemplate(templateId)`: 获取模板
- `listTemplates()`: 列出所有模板
- `applyTemplate(templateId, customConfig)`: 应用模板

## 📦 预定义模板

Agent SDK 提供以下预定义模板：

- `template_chat`: Chat Assistant（聊天助手）
- `template_coder`: Code Assistant（代码助手）
- `template_analyzer`: Data Analyst（数据分析助手）
- `template_writer`: Content Writer（内容写作助手）

## 🎯 使用示例

查看 `agent.example.ts` 文件获取更多示例：

```typescript
// 运行示例
node -r tsx src/agent/agent.example.ts
```

## 🔧 自定义 Agent

继承 `AgentBase` 类创建自定义 Agent：

```typescript
import { AgentBase, AgentConfig, AgentExecutionRequest, AgentExecutionResponse } from '@spakjs/core'

class MyCustomAgent extends AgentBase {
  protected async execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    // 自定义执行逻辑
    const response = await this.providerSystem.executeRequest(this.provider, request.messages)

    return {
      agentId: this.id,
      output: response,
      messages: request.messages,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      cost: 0.01,
      executionTime: 1000,
      success: true
    }
  }
}
```

## 📊 指标系统

Agent SDK 自动收集以下指标：

- 总请求数
- 成功/失败请求数
- 平均响应时间
- Token 使用量
- 成本统计
- 运行时间

## 🔒 安全性

- ✅ Agent 级别的启用/禁用控制
- ✅ 工具级别的权限控制
- ✅ Provider API Key 保护
- ✅ 执行超时控制

## 🚧 下一步

- [ ] 支持 Streaming 执行
- [ ] 支持 Agent 协作
- [ ] 支持 Agent 集群
- [ ] 支持更多 Provider
- [ ] 增强工具生态

## 📝 License

MIT License
