import { AgentTemplate, AgentConfig } from './types';
/**
 * Agent 模板管理器
 * 负责管理 Agent 模板的创建、查询和应用
 */
export declare class AgentTemplateManagerImpl {
    private templates;
    private templatesByCategory;
    /**
     * 创建模板
     */
    createTemplate(template: AgentTemplate): AgentTemplate;
    /**
     * 获取模板
     */
    getTemplate(templateId: string): AgentTemplate | null;
    /**
     * 列出所有模板
     */
    listTemplates(): AgentTemplate[];
    /**
     * 按类别列出模板
     */
    listTemplatesByCategory(category: string): AgentTemplate[];
    /**
     * 应用模板到配置
     */
    applyTemplate(templateId: string, customConfig?: Partial<AgentConfig>): AgentConfig;
    /**
     * 获取模板数量
     */
    getTemplateCount(): number;
    /**
     * 获取类别数量
     */
    getCategoryCount(): number;
    /**
     * 获取某个类别的模板数量
     */
    getTemplateCountByCategory(category: string): number;
    /**
     * 删除模板
     */
    deleteTemplate(templateId: string): boolean;
    /**
     * 清空所有模板
     */
    clear(): void;
    /**
     * 预定义模板
     */
    static predefinedTemplates(): AgentTemplate[];
}
//# sourceMappingURL=template-manager.d.ts.map