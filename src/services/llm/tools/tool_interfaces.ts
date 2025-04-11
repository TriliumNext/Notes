/**
 * Tool Interfaces
 * 
 * This file defines the interfaces for the LLM tool calling system.
 */

/**
 * Interface for a tool definition to be sent to the LLM
 */
export interface Tool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, ToolParameter>;
            required: string[];
        };
    };
}

/**
 * Interface for a tool parameter
 */
export interface ToolParameter {
    type: string;
    description: string;
    enum?: string[];
}

/**
 * Interface for a tool call from the LLM
 */
export interface ToolCall {
    id?: string;
    type?: string;
    function: {
        name: string;
        arguments: Record<string, any> | string;
    };
}

/**
 * Interface for a tool handler that executes a tool
 */
export interface ToolHandler {
    /**
     * Tool definition to be sent to the LLM
     */
    definition: Tool;
    
    /**
     * Execute the tool with the given arguments
     */
    execute(args: Record<string, any>): Promise<string | object>;
}
