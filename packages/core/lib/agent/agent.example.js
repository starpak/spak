"use strict";
// ===== @spakjs/core Agent SDK - Usage Examples =====
// Agent SDK 使用示例
Object.defineProperty(exports, "__esModule", { value: true });
exports.example1_CreateAgent = example1_CreateAgent;
exports.example2_CreateAgentFromTemplate = example2_CreateAgentFromTemplate;
exports.example3_ToolSystem = example3_ToolSystem;
exports.example4_ProviderSystem = example4_ProviderSystem;
exports.example5_ManagementAndMonitoring = example5_ManagementAndMonitoring;
const types_1 = require("./types");
/**
 * 示例 1: 创建和使用 Agent
 */
async function example1_CreateAgent() {
    console.log('=== 示例 1: 创建和使用 Agent ===\n');
    // 创建 Agent 管理器
    const manager = new types_1.AgentManagerImpl();
    // 创建一个聊天助手 Agent
    const config = {
        name: 'My Chat Assistant',
        description: '一个自定义的聊天助手',
        modelId: 'gpt-4',
        provider: 'openai',
        tools: ['web_search', 'file_reader'],
        maxRetries: 3,
        temperature: 0.7,
        systemPrompt: '你是一个有用的助手',
        enabled: true
    };
    // 创建 Agent
    const agent = await manager.createAgent(config);
    console.log(`Agent created: ${agent.name} (ID: ${agent.id})`);
    console.log(`Status: ${agent.status}`);
    console.log(`Tools: ${agent.tools.join(', ')}\n`);
    // 执行 Agent
    const request = {
        agentId: agent.id,
        input: '你好，请介绍一下自己',
        messages: [
            {
                role: 'system',
                content: agent.config.systemPrompt || '',
                timestamp: Date.now()
            },
            {
                role: 'user',
                content: '你好，请介绍一下自己',
                timestamp: Date.now()
            }
        ]
    };
    const response = await manager.executeAgent(request);
    console.log(`Response: ${response.output}`);
    console.log(`Success: ${response.success}`);
    console.log(`Execution time: ${response.executionTime}ms\n`);
}
/**
 * 示例 2: 使用模板创建 Agent
 */
async function example2_CreateAgentFromTemplate() {
    console.log('=== 示例 2: 使用模板创建 Agent ===\n');
    // 创建模板管理器并加载预定义模板
    const templateManager = new types_1.AgentTemplateManagerImpl();
    const templates = types_1.AgentTemplateManagerImpl.predefinedTemplates();
    templates.forEach(template => {
        templateManager.createTemplate(template);
    });
    console.log(`Loaded ${templateManager.getTemplateCount()} templates`);
    console.log(`Categories: ${templateManager.getCategoryCount()}\n`);
    // 从模板创建 Agent
    const templateConfig = templateManager.applyTemplate('template_chat', {
        name: 'Custom Chat Assistant'
    });
    // 确保必需字段存在
    const config = {
        name: templateConfig.name || 'Custom Agent',
        modelId: templateConfig.modelId || 'gpt-4',
        provider: templateConfig.provider || 'openai',
        description: templateConfig.description,
        tools: templateConfig.tools || [],
        maxRetries: templateConfig.maxRetries,
        temperature: templateConfig.temperature,
        systemPrompt: templateConfig.systemPrompt,
        maxTokens: templateConfig.maxTokens,
        timeout: templateConfig.timeout,
        enabled: templateConfig.enabled,
        metadata: templateConfig.metadata
    };
    const manager = new types_1.AgentManagerImpl();
    const agent = await manager.createAgent(config);
    console.log(`Agent created from template: ${agent.name}`);
    console.log(`Template used: template_chat\n`);
}
/**
 * 示例 3: 使用工具系统
 */
async function example3_ToolSystem() {
    console.log('=== 示例 3: 使用工具系统 ===\n');
    const toolSystem = new types_1.ToolSystemImpl();
    // 注册工具
    const toolConfig = {
        id: 'web_search',
        name: 'Web Search',
        description: '搜索网络信息',
        category: 'search',
        parameters: {
            query: { type: 'string', required: true }
        },
        permissions: ['read:web'],
        enabled: true
    };
    await toolSystem.registerTool(toolConfig);
    console.log(`Tool registered: ${toolConfig.name}\n`);
    // 列出所有工具
    const tools = await toolSystem.listTools();
    console.log(`Total tools: ${tools.length}\n`);
    // 执行工具
    const toolParams = {
        query: 'AI Agent framework'
    };
    const result = await toolSystem.executeTool({
        agentId: 'agent_test',
        toolId: 'web_search',
        params: toolParams,
        context: {}
    });
    console.log(`Tool result: ${JSON.stringify(result, null, 2)}\n`);
}
/**
 * 示例 4: 使用 Provider 系统
 */
async function example4_ProviderSystem() {
    console.log('=== 示例 4: 使用 Provider 系统 ===\n');
    const providerSystem = new types_1.ProviderSystemImpl();
    // 注册 Provider
    const providerConfig = {
        id: 'openai',
        name: 'OpenAI',
        type: 'llm',
        apiKey: 'sk-xxx',
        baseUrl: 'https://api.openai.com/v1',
        maxTokens: 4096,
        timeout: 30000,
        enabled: true
    };
    await providerSystem.registerProvider(providerConfig);
    console.log(`Provider registered: ${providerConfig.name}\n`);
    // 列出所有 Provider
    const providers = await providerSystem.listProviders();
    console.log(`Total providers: ${providers.length}\n`);
    // 执行请求
    const messages = [
        {
            role: 'system',
            content: '你是一个有用的助手',
            timestamp: Date.now()
        },
        {
            role: 'user',
            content: '你好',
            timestamp: Date.now()
        }
    ];
    const response = await providerSystem.executeRequest('openai', messages);
    console.log(`Provider response: ${response}\n`);
}
/**
 * 示例 5: Agent 管理和监控
 */
async function example5_ManagementAndMonitoring() {
    console.log('=== 示例 5: Agent 管理和监控 ===\n');
    const manager = new types_1.AgentManagerImpl();
    // 创建多个 Agent
    const agents = await Promise.all([
        manager.createAgent({
            name: 'Agent 1',
            modelId: 'gpt-4',
            provider: 'openai',
            tools: []
        }),
        manager.createAgent({
            name: 'Agent 2',
            modelId: 'gpt-4',
            provider: 'openai',
            tools: []
        }),
        manager.createAgent({
            name: 'Agent 3',
            modelId: 'gpt-4',
            provider: 'openai',
            tools: []
        })
    ]);
    console.log(`Created ${agents.length} agents\n`);
    // 列出所有 Agent
    const allAgents = await manager.listAgents();
    console.log(`Total agents: ${allAgents.length}\n`);
    // 按 Provider 查询
    const openaiAgents = await manager.getAgentsByProvider('openai');
    console.log(`Agents using OpenAI: ${openaiAgents.length}\n`);
    // 获取指标
    const metrics = await manager.listMetrics();
    console.log(`Total metrics: ${metrics.size}\n`);
    // 禁用某个 Agent
    await manager.disableAgent(agents[0].id);
    console.log(`Disabled agent: ${agents[0].id}\n`);
    // 清理
    await manager.clear();
    console.log('Cleared all agents\n');
}
/**
 * 主函数：运行所有示例
 */
async function main() {
    try {
        await example1_CreateAgent();
        await example2_CreateAgentFromTemplate();
        await example3_ToolSystem();
        await example4_ProviderSystem();
        await example5_ManagementAndMonitoring();
        console.log('=== 所有示例运行完成 ===');
    }
    catch (error) {
        console.error('Error running examples:', error);
    }
}
// 如果直接运行此文件
if (require.main === module) {
    main();
}
//# sourceMappingURL=agent.example.js.map