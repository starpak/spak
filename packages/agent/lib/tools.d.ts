/**
 * Built-in tools for the agent module
 * Reimagined from opencode's tools.go for TypeScript/Spak
 */
import type { BaseTool, ToolInfo, ToolCall, ToolResult } from './types';
/** Permission check function type */
export type PermissionChecker = (action: string, target?: string) => Promise<boolean>;
/** Context for tool execution */
export interface ToolContext {
    sessionId: string;
    signal?: AbortSignal;
    cwd?: string;
    permissionChecker?: PermissionChecker;
}
/**
 * Bash tool - Execute shell commands
 */
export declare class BashTool implements BaseTool {
    private permissionChecker?;
    info: ToolInfo;
    constructor(permissionChecker?: PermissionChecker | undefined);
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Read/Fetch tool - Read file contents
 */
export declare class FetchTool implements BaseTool {
    private permissionChecker?;
    info: ToolInfo;
    constructor(permissionChecker?: PermissionChecker | undefined);
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Write tool - Write content to a file
 */
export declare class WriteTool implements BaseTool {
    private permissionChecker?;
    info: ToolInfo;
    constructor(permissionChecker?: PermissionChecker | undefined);
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Edit tool - Apply edits to a file using LSP or direct manipulation
 */
export declare class EditTool implements BaseTool {
    private permissionChecker?;
    info: ToolInfo;
    constructor(permissionChecker?: PermissionChecker | undefined);
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * List directory tool
 */
export declare class LsTool implements BaseTool {
    info: ToolInfo;
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Glob tool - Find files matching a pattern
 */
export declare class GlobTool implements BaseTool {
    info: ToolInfo;
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Grep tool - Search for text in files
 */
export declare class GrepTool implements BaseTool {
    info: ToolInfo;
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * View tool - View a section of a file
 */
export declare class ViewTool implements BaseTool {
    info: ToolInfo;
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Patch tool - Apply a unified diff patch
 */
export declare class PatchTool implements BaseTool {
    private permissionChecker?;
    info: ToolInfo;
    constructor(permissionChecker?: PermissionChecker | undefined);
    run(ctx: ToolContext, call: ToolCall): Promise<ToolResult>;
}
/**
 * Get all built-in tools
 */
export declare function getBuiltinTools(permissionChecker?: PermissionChecker): BaseTool[];
//# sourceMappingURL=tools.d.ts.map