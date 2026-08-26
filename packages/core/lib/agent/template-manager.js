"use strict";
// ===== @spakjs/core Agent SDK - Agent Template Manager =====
// Agent 模板管理器实现
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTemplateManagerImpl = void 0;
/**
 * Agent 模板管理器
 * 负责管理 Agent 模板的创建、查询和应用
 */
class AgentTemplateManagerImpl {
    templates = new Map();
    templatesByCategory = new Map();
    /**
     * 创建模板
     */
    createTemplate(template) {
        this.templates.set(template.id, template);
        // 按类别索引
        if (template.category) {
            if (!this.templatesByCategory.has(template.category)) {
                this.templatesByCategory.set(template.category, new Set());
            }
            this.templatesByCategory.get(template.category).add(template.id);
        }
        return template;
    }
    /**
     * 获取模板
     */
    getTemplate(templateId) {
        return this.templates.get(templateId) || null;
    }
    /**
     * 列出所有模板
     */
    listTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * 按类别列出模板
     */
    listTemplatesByCategory(category) {
        const templateIds = this.templatesByCategory.get(category);
        if (!templateIds)
            return [];
        const templates = [];
        for (const id of templateIds) {
            const template = this.templates.get(id);
            if (template) {
                templates.push(template);
            }
        }
        return templates;
    }
    /**
     * 应用模板到配置
     */
    applyTemplate(templateId, customConfig) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        // 合并模板配置和自定义配置
        const baseConfig = template.config;
        return {
            id: customConfig?.id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: customConfig?.name || template.name || '',
            description: customConfig?.description || template.description || '',
            modelId: customConfig?.modelId || baseConfig.modelId || '',
            provider: customConfig?.provider || baseConfig.provider || '',
            tools: customConfig?.tools || baseConfig.tools,
            maxRetries: customConfig?.maxRetries ?? baseConfig.maxRetries,
            temperature: customConfig?.temperature ?? baseConfig.temperature,
            systemPrompt: customConfig?.systemPrompt ?? baseConfig.systemPrompt,
            maxTokens: customConfig?.maxTokens ?? baseConfig.maxTokens,
            timeout: customConfig?.timeout ?? baseConfig.timeout,
            enabled: customConfig?.enabled ?? baseConfig.enabled,
            metadata: {
                ...baseConfig.metadata,
                ...customConfig?.metadata
            }
        };
    }
    /**
     * 获取模板数量
     */
    getTemplateCount() {
        return this.templates.size;
    }
    /**
     * 获取类别数量
     */
    getCategoryCount() {
        return this.templatesByCategory.size;
    }
    /**
     * 获取某个类别的模板数量
     */
    getTemplateCountByCategory(category) {
        const templateIds = this.templatesByCategory.get(category);
        return templateIds ? templateIds.size : 0;
    }
    /**
     * 删除模板
     */
    deleteTemplate(templateId) {
        const template = this.templates.get(templateId);
        if (!template)
            return false;
        // 从类别索引中移除
        if (template.category) {
            const categoryTemplates = this.templatesByCategory.get(template.category);
            if (categoryTemplates) {
                categoryTemplates.delete(templateId);
                if (categoryTemplates.size === 0) {
                    this.templatesByCategory.delete(template.category);
                }
            }
        }
        this.templates.delete(templateId);
        return true;
    }
    /**
     * 清空所有模板
     */
    clear() {
        this.templates.clear();
        this.templatesByCategory.clear();
    }
    /**
     * 预定义模板
     */
    static predefinedTemplates() {
        return [
            {
                id: 'template_chat',
                name: 'Chat Assistant',
                description: '一个通用的聊天助手',
                icon: '💬',
                category: 'chat',
                config: {
                    name: 'Chat Assistant',
                    description: '一个通用的聊天助手',
                    modelId: 'gpt-4',
                    provider: 'openai',
                    tools: [],
                    maxRetries: 3,
                    temperature: 0.7,
                    systemPrompt: '你是一个有用的助手',
                    maxTokens: 4096,
                    timeout: 30000
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                id: 'template_coder',
                name: 'Code Assistant',
                description: '专门用于代码编写的助手',
                icon: '💻',
                category: 'coding',
                config: {
                    name: 'Code Assistant',
                    description: '专门用于代码编写的助手',
                    modelId: 'gpt-4',
                    provider: 'openai',
                    tools: ['code_editor', 'file_search'],
                    maxRetries: 3,
                    temperature: 0.3,
                    systemPrompt: '你是一个专业的编程助手',
                    maxTokens: 8192,
                    timeout: 60000
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                id: 'template_analyzer',
                name: 'Data Analyst',
                description: '数据分析助手',
                icon: '📊',
                category: 'data',
                config: {
                    name: 'Data Analyst',
                    description: '数据分析助手',
                    modelId: 'gpt-4',
                    provider: 'openai',
                    tools: ['data_analysis', 'visualization'],
                    maxRetries: 3,
                    temperature: 0.5,
                    systemPrompt: '你是一个数据分析专家',
                    maxTokens: 8192,
                    timeout: 60000
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            },
            {
                id: 'template_writer',
                name: 'Content Writer',
                description: '内容写作助手',
                icon: '✍️',
                category: 'writing',
                config: {
                    name: 'Content Writer',
                    description: '内容写作助手',
                    modelId: 'gpt-4',
                    provider: 'openai',
                    tools: [],
                    maxRetries: 3,
                    temperature: 0.8,
                    systemPrompt: '你是一个专业的文案写作专家',
                    maxTokens: 8192,
                    timeout: 60000
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            }
        ];
    }
}
exports.AgentTemplateManagerImpl = AgentTemplateManagerImpl;
//# sourceMappingURL=template-manager.js.map