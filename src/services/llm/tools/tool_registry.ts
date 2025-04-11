/**
 * Tool Registry
 *
 * This file defines the registry for tools that can be called by LLMs.
 */

import type { Tool, ToolHandler } from './tool_interfaces.js';
import log from '../../log.js';

/**
 * Registry for tools that can be called by LLMs
 */
export class ToolRegistry {
    private static instance: ToolRegistry;
    private tools: Map<string, ToolHandler> = new Map();

    private constructor() {}

    /**
     * Get singleton instance of the tool registry
     */
    public static getInstance(): ToolRegistry {
        if (!ToolRegistry.instance) {
            ToolRegistry.instance = new ToolRegistry();
        }
        
        return ToolRegistry.instance;
    }

    /**
     * Register a tool with the registry
     */
    public registerTool(handler: ToolHandler): void {
        const name = handler.definition.function.name;

        if (this.tools.has(name)) {
            log.info(`Tool '${name}' already registered, replacing...`);
        }

        this.tools.set(name, handler);
        log.info(`Registered tool: ${name}`);
    }

    /**
     * Get a tool by name
     */
    public getTool(name: string): ToolHandler | undefined {
        return this.tools.get(name);
    }

    /**
     * Get all registered tools
     */
    public getAllTools(): ToolHandler[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get all tool definitions for sending to LLM
     */
    public getAllToolDefinitions(): Tool[] {
        const toolDefs = Array.from(this.tools.values()).map(handler => handler.definition);
        return toolDefs;
    }
}

// Export singleton instance
const toolRegistry = ToolRegistry.getInstance();
export default toolRegistry;
