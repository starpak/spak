/**
 * Built-in tools for the agent module
 * Reimagined from opencode's tools.go for TypeScript/Spak
 */

import type { BaseTool, ToolInfo, ToolCall, ToolResult } from './types'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { resolve, relative, dirname } from 'path'
import { execSync, spawn } from 'child_process'
import { createLogger } from '@spakjs/log'

const logger = createLogger('agent:tools')

/** Permission check function type */
export type PermissionChecker = (action: string, target?: string) => Promise<boolean>

/** Context for tool execution */
export interface ToolContext {
  sessionId: string
  signal?: AbortSignal
  cwd?: string
  permissionChecker?: PermissionChecker
}

/**
 * Bash tool - Execute shell commands
 */
export class BashTool implements BaseTool {
  info: ToolInfo = {
    name: 'bash',
    description: 'Execute a bash command in the terminal',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The bash command to execute' },
      },
      required: ['command'],
    },
  }

  constructor(private permissionChecker?: PermissionChecker) {}

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const command = call.input.command as string
    
    if (this.permissionChecker && !(await this.permissionChecker('execute_command', command))) {
      return {
        toolCallId: call.id,
        content: 'Permission denied: command execution not allowed',
        isError: true,
      }
    }

    try {
      const result = execSync(command, {
        encoding: 'utf-8',
        cwd: ctx.cwd || process.cwd(),
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })
      
      return {
        toolCallId: call.id,
        content: result,
        metadata: { exitCode: 0 },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Command failed: ${error.message}\n\nStdout: ${error.stdout || ''}\nStderr: ${error.stderr || ''}`,
        isError: true,
        metadata: { exitCode: error.status || 1 },
      }
    }
  }
}

/**
 * Read/Fetch tool - Read file contents
 */
export class FetchTool implements BaseTool {
  info: ToolInfo = {
    name: 'fetch',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to read' },
      },
      required: ['path'],
    },
  }

  constructor(private permissionChecker?: PermissionChecker) {}

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const filePath = call.input.path as string
    
    if (this.permissionChecker && !(await this.permissionChecker('read_file', filePath))) {
      return {
        toolCallId: call.id,
        content: 'Permission denied: file read not allowed',
        isError: true,
      }
    }

    try {
      const fullPath = resolve(ctx.cwd || process.cwd(), filePath)
      const content = readFileSync(fullPath, 'utf-8')
      
      return {
        toolCallId: call.id,
        content: content,
        metadata: { path: fullPath, size: content.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to read file: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * Write tool - Write content to a file
 */
export class WriteTool implements BaseTool {
  info: ToolInfo = {
    name: 'write',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to write' },
        content: { type: 'string', description: 'Content to write to the file' },
      },
      required: ['path', 'content'],
    },
  }

  constructor(private permissionChecker?: PermissionChecker) {}

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const filePath = call.input.path as string
    const content = call.input.content as string
    
    if (this.permissionChecker && !(await this.permissionChecker('write_file', filePath))) {
      return {
        toolCallId: call.id,
        content: 'Permission denied: file write not allowed',
        isError: true,
      }
    }

    try {
      const fullPath = resolve(ctx.cwd || process.cwd(), filePath)
      writeFileSync(fullPath, content, 'utf-8')
      
      return {
        toolCallId: call.id,
        content: `Successfully wrote ${content.length} bytes to ${filePath}`,
        metadata: { path: fullPath, size: content.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to write file: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * Edit tool - Apply edits to a file using LSP or direct manipulation
 */
export class EditTool implements BaseTool {
  info: ToolInfo = {
    name: 'edit',
    description: 'Apply an edit to a file. Specify the start line and end line of the block to replace, and the new content',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file to edit' },
        startLine: { type: 'number', description: 'Start line (0-indexed) of the block to replace' },
        endLine: { type: 'number', description: 'End line (exclusive) of the block to replace' },
        newContent: { type: 'string', description: 'New content to replace the specified lines with' },
      },
      required: ['path', 'startLine', 'endLine', 'newContent'],
    },
  }

  constructor(private permissionChecker?: PermissionChecker) {}

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const filePath = call.input.path as string
    const startLine = call.input.startLine as number
    const endLine = call.input.endLine as number
    const newContent = call.input.newContent as string
    
    if (this.permissionChecker && !(await this.permissionChecker('edit_file', filePath))) {
      return {
        toolCallId: call.id,
        content: 'Permission denied: file edit not allowed',
        isError: true,
      }
    }

    try {
      const fullPath = resolve(ctx.cwd || process.cwd(), filePath)
      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      
      if (startLine < 0 || endLine > lines.length || startLine > endLine) {
        return {
          toolCallId: call.id,
          content: `Invalid line range: ${startLine}-${endLine} for file with ${lines.length} lines`,
          isError: true,
        }
      }
      
      // Replace the specified lines
      const newLines = [
        ...lines.slice(0, startLine),
        ...newContent.split('\n'),
        ...lines.slice(endLine),
      ]
      
      writeFileSync(fullPath, newLines.join('\n'), 'utf-8')
      
      return {
        toolCallId: call.id,
        content: `Successfully edited file ${filePath} (lines ${startLine}-${endLine})`,
        metadata: { path: fullPath, linesChanged: endLine - startLine },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to edit file: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * List directory tool
 */
export class LsTool implements BaseTool {
  info: ToolInfo = {
    name: 'ls',
    description: 'List contents of a directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
      },
      required: ['path'],
    },
  }

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const dirPath = call.input.path as string

    try {
      const fullPath = resolve(ctx.cwd || process.cwd(), dirPath)
      const entries = readdirSync(fullPath, { withFileTypes: true })
      
      const result = entries.map(entry => {
        const stats = statSync(resolve(fullPath, entry.name))
        return {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other',
          size: entry.isFile() ? stats.size : undefined,
        }
      })
      
      return {
        toolCallId: call.id,
        content: JSON.stringify(result, null, 2),
        metadata: { path: fullPath, count: entries.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to list directory: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * Glob tool - Find files matching a pattern
 */
export class GlobTool implements BaseTool {
  info: ToolInfo = {
    name: 'glob',
    description: 'Find files matching a glob pattern',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern to match' },
      },
      required: ['pattern'],
    },
  }

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const pattern = call.input.pattern as string

    try {
      // Simple glob implementation - can be enhanced with fast-glob or similar
      const cwd = ctx.cwd || process.cwd()
      const matches: string[] = []
      
      function search(dir: string) {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const fullPath = resolve(dir, entry.name)
          if (entry.isDirectory()) {
            search(fullPath)
          } else if (entry.isFile()) {
            const relPath = relative(cwd, fullPath)
            if (matchesPattern(relPath, pattern)) {
              matches.push(relPath)
            }
          }
        }
      }
      
      search(cwd)
      
      return {
        toolCallId: call.id,
        content: matches.join('\n'),
        metadata: { pattern, count: matches.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to glob: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * Grep tool - Search for text in files
 */
export class GrepTool implements BaseTool {
  info: ToolInfo = {
    name: 'grep',
    description: 'Search for a pattern in files',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Pattern to search for' },
        path: { type: 'string', description: 'Directory or file to search in' },
      },
      required: ['pattern'],
    },
  }

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const pattern = call.input.pattern as string
    const searchPath = call.input.path as string || '.'

    try {
      const cwd = ctx.cwd || process.cwd()
      const fullPath = resolve(cwd, searchPath)
      const results: Array<{ file: string; line: number; content: string }> = []
      
      function search(dir: string) {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (ctx.signal?.aborted) break
          if (entry.name.startsWith('.')) continue
          const entryPath = resolve(dir, entry.name)
          if (entry.isDirectory()) {
            search(entryPath)
          } else if (entry.isFile()) {
            try {
              const content = readFileSync(entryPath, 'utf-8')
              const lines = content.split('\n')
              lines.forEach((line, idx) => {
                if (line.includes(pattern)) {
                  results.push({
                    file: relative(cwd, entryPath),
                    line: idx + 1,
                    content: line.trim(),
                  })
                }
              })
            } catch {
              // Skip binary files
            }
          }
        }
      }
      
      search(fullPath)
      
      return {
        toolCallId: call.id,
        content: results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n'),
        metadata: { pattern, count: results.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to grep: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * View tool - View a section of a file
 */
export class ViewTool implements BaseTool {
  info: ToolInfo = {
    name: 'view',
    description: 'View a section of a file with line numbers',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to view' },
        startLine: { type: 'number', description: 'Start line (0-indexed)' },
        endLine: { type: 'number', description: 'End line (exclusive)' },
      },
      required: ['path'],
    },
  }

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const filePath = call.input.path as string
    const startLine = call.input.startLine as number | undefined
    const endLine = call.input.endLine as number | undefined

    try {
      const fullPath = resolve(ctx.cwd || process.cwd(), filePath)
      const content = readFileSync(fullPath, 'utf-8')
      const lines = content.split('\n')
      
      const start = startLine ?? 0
      const end = endLine ?? lines.length
      const section = lines.slice(start, end)
      
      const numberedLines = section.map((line, i) => 
        `${String(i + start).padStart(4)}: ${line}`
      )
      
      return {
        toolCallId: call.id,
        content: numberedLines.join('\n'),
        metadata: { path: fullPath, lines: section.length, totalLines: lines.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to view file: ${error.message}`,
        isError: true,
      }
    }
  }
}

/**
 * Patch tool - Apply a unified diff patch
 */
export class PatchTool implements BaseTool {
  info: ToolInfo = {
    name: 'patch',
    description: 'Apply a unified diff patch to a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to patch' },
        patch: { type: 'string', description: 'Unified diff patch content' },
      },
      required: ['path', 'patch'],
    },
  }

  constructor(private permissionChecker?: PermissionChecker) {}

  async run(ctx: ToolContext, call: ToolCall): Promise<ToolResult> {
    const filePath = call.input.path as string
    const patchContent = call.input.patch as string
    
    if (this.permissionChecker && !(await this.permissionChecker('patch_file', filePath))) {
      return {
        toolCallId: call.id,
        content: 'Permission denied: patch application not allowed',
        isError: true,
      }
    }

    try {
      // For now, just log that we would apply the patch
      // A full implementation would parse and apply unified diffs
      logger.info(`Would apply patch to ${filePath}`)
      
      return {
        toolCallId: call.id,
        content: `Patch prepared for ${filePath}. Note: Full patch application requires additional implementation.`,
        metadata: { path: filePath, patchSize: patchContent.length },
      }
    } catch (error: any) {
      return {
        toolCallId: call.id,
        content: `Failed to prepare patch: ${error.message}`,
        isError: true,
      }
    }
  }
}

// Helper function for simple glob pattern matching
function matchesPattern(str: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  
  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(str)
}

/**
 * Get all built-in tools
 */
export function getBuiltinTools(permissionChecker?: PermissionChecker): BaseTool[] {
  return [
    new BashTool(permissionChecker),
    new FetchTool(permissionChecker),
    new WriteTool(permissionChecker),
    new EditTool(permissionChecker),
    new LsTool(),
    new GlobTool(),
    new GrepTool(),
    new ViewTool(),
    new PatchTool(permissionChecker),
  ]
}
