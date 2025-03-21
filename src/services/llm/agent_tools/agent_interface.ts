/**
 * Agent Interface
 *
 * This file defines the core interfaces for implementing agent functionality in Trilium Notes.
 * It provides a structured approach for LLMs to interact with various tools and the knowledge base.
 */

// Define the Message interface here instead of importing to avoid circular dependencies
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  name?: string;
}

/**
 * Represents a tool that an agent can use
 */
export interface AgentTool {
  /** Unique identifier for the tool */
  name: string;
  
  /** Human-readable description of what the tool does */
  description: string;
  
  /** Schema definition for the tool's parameters */
  parameters: Record<string, unknown>;
  
  /** The function to execute when the tool is called */
  execute: (parameters: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Represents the result of a tool execution
 */
export interface ToolExecutionResult {
  /** The name of the tool that was executed */
  toolName: string;
  
  /** The result of the tool execution */
  result: unknown;
  
  /** Whether the execution was successful */
  success: boolean;
  
  /** Error message if the execution failed */
  error?: string;
}

/**
 * Represents a function call made by the LLM
 */
export interface FunctionCall {
  /** The name of the function to call */
  name: string;
  
  /** The arguments to pass to the function */
  arguments: Record<string, unknown>;
}

/**
 * Represents a parsed agent message with potential function calls
 */
export interface AgentMessage {
  /** Text content of the message */
  content: string;
  
  /** Any function calls the agent wants to make */
  functionCalls?: FunctionCall[];
}

/**
 * Defines the structure for an agent execution
 */
export interface AgentExecution {
  /** Unique ID for this execution */
  id: string;
  
  /** The original user query */
  query: string;
  
  /** The note ID context */
  contextNoteId?: string;
  
  /** Messages exchanged during execution */
  messages: Message[];
  
  /** Current status */
  status: 'created' | 'running' | 'completed' | 'failed';
  
  /** Results from tool executions */
  toolResults: ToolExecutionResult[];
  
  /** Start time */
  startTime: number;
  
  /** End time (if completed) */
  endTime?: number;
  
  /** Final response */
  finalResponse?: string;
  
  /** Error (if failed) */
  error?: string;
}

/**
 * Configuration for agent execution
 */
export interface AgentConfig {
  /** Maximum number of tool calls allowed */
  maxIterations?: number;
  
  /** Whether to show thinking process */
  showThinking?: boolean;
  
  /** Whether to return intermediate steps */
  returnIntermediateSteps?: boolean;
  
  /** Function calling format to use */
  functionCallFormat?: 'json' | 'structured';
  
  /** Additional system instructions */
  additionalInstructions?: string;
  
  /** Optional context note ID */
  contextNoteId?: string;
}

/**
 * Interface for the main agent executor
 */
export interface IAgentExecutor {
  /**
   * Execute an agent with the given query and tools
   * 
   * @param query The user's query
   * @param tools The tools available to the agent
   * @param options Configuration options
   * @returns The result of the agent execution
   */
  execute(
    query: string, 
    tools: AgentTool[], 
    options?: AgentConfig
  ): Promise<AgentExecution>;
  
  /**
   * Register a tool with the agent executor
   * 
   * @param tool The tool to register
   */
  registerTool(tool: AgentTool): void;
  
  /**
   * Get all registered tools
   */
  getTools(): AgentTool[];
}

// Create a concrete instance to ensure interfaces are compiled correctly
export const AgentInterfaces = {
  isAgentConfig: (config: unknown): config is AgentConfig => {
    return typeof config === 'object' && config !== null;
  }
};