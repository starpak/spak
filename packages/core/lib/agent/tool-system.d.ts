import { ToolConfig, ToolResult, ToolExecutionParams, ToolSystem } from './types';
/**
 * 工具系统
 * 负责注册、查询和执行工具
 */
export declare class ToolSystemImpl implements ToolSystem {
    private tools;
    private toolImplementations;
    /**
     * 注册工具
     */
    registerTool(config: ToolConfig): Promise<boolean>;
    /**
     * 注销工具
     */
    unregisterTool(toolId: string): Promise<boolean>;
    /**
     * 获取工具配置
     */
    getTool(toolId: string): Promise<ToolConfig | null>;
    /**
     * 列出所有工具
     */
    listTools(): Promise<ToolConfig[]>;
    /**
     * 执行工具
     */
    executeTool(params: ToolExecutionParams): Promise<ToolResult>;
    /**
     * 获取工具权限
     */
    getToolPermissions(toolId: string): Promise<string[]>;
    /**
     * 检查工具是否已注册
     */
    hasTool(toolId: string): boolean;
    /**
     * 检查工具是否已启用
     */
    isToolEnabled(toolId: string): boolean;
    /**
     * 启用工具
     */
    enableTool(toolId: string): Promise<boolean>;
    /**
     * 禁用工具
     */
    disableTool(toolId: string): Promise<boolean>;
    /**
     * 默认工具实现（示例）
     */
    private defaultToolImplementation;
    /**
     * 清空所有工具
     */
    clear(): Promise<void>;
}
/**
 * 工具函数类型
 */
export type ToolFunction = (params: Record<string, any>, context?: Record<string, any>) => Promise<any>;
//# sourceMappingURL=tool-system.d.ts.map