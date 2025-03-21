/**
 * Agent Tools Index
 *
 * This file exports all available agent tools for use by the LLM.
 * Tools are prioritized in order of importance/impact.
 */

import { VectorSearchTool } from './vector_search_tool.js';
import { NoteNavigatorTool } from './note_navigator_tool.js';
import { QueryDecompositionTool } from './query_decomposition_tool.js';
import { ContextualThinkingTool } from './contextual_thinking_tool.js';

// Import agent system
import type { AgentTool } from './agent_interface.js';
import { AgentInterfaces } from './agent_interface.js';
import { AgentExecutor } from './agent_executor.js';
import { createAgentTools } from './tool_adapters.js';

// Import services needed for initialization
import contextService from '../context_service.js';
import log from '../../log.js';

/**
 * Manages all agent tools and provides a unified interface for the LLM agent
 */
export class AgentToolsManager {
  private vectorSearchTool: VectorSearchTool | null = null;
  private noteNavigatorTool: NoteNavigatorTool | null = null;
  private queryDecompositionTool: QueryDecompositionTool | null = null;
  private contextualThinkingTool: ContextualThinkingTool | null = null;
  private initialized = false;

  constructor() {
    // Initialize tools only when requested to avoid circular dependencies
  }

  async initialize(_serviceManager: unknown): Promise<void> {
    try {
      if (this.initialized) {
        return;
      }

      log.info("Initializing LLM agent tools...");

      // Create tools
      this.vectorSearchTool = new VectorSearchTool();
      this.noteNavigatorTool = new NoteNavigatorTool();
      this.queryDecompositionTool = new QueryDecompositionTool();
      this.contextualThinkingTool = new ContextualThinkingTool();

      // Set context service in the vector search tool
      this.vectorSearchTool.setContextService(contextService);

      this.initialized = true;
      log.info("LLM agent tools initialized successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to initialize agent tools: ${errorMessage}`);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all available agent tools
   * @returns Object containing all initialized tools
   */
  getAllTools() {
    if (!this.initialized) {
      throw new Error("Agent tools not initialized. Call initialize() first.");
    }

    return {
      vectorSearch: this.vectorSearchTool,
      noteNavigator: this.noteNavigatorTool,
      queryDecomposition: this.queryDecompositionTool,
      contextualThinking: this.contextualThinkingTool
    };
  }

  /**
   * Get the vector search tool
   */
  getVectorSearchTool(): VectorSearchTool {
    if (!this.initialized || !this.vectorSearchTool) {
      throw new Error("Vector search tool not initialized");
    }
    return this.vectorSearchTool;
  }

  /**
   * Get the note structure navigator tool
   */
  getNoteNavigatorTool(): NoteNavigatorTool {
    if (!this.initialized || !this.noteNavigatorTool) {
      throw new Error("Note navigator tool not initialized");
    }
    return this.noteNavigatorTool;
  }

  /**
   * Get the query decomposition tool
   */
  getQueryDecompositionTool(): QueryDecompositionTool {
    if (!this.initialized || !this.queryDecompositionTool) {
      throw new Error("Query decomposition tool not initialized");
    }
    return this.queryDecompositionTool;
  }

  /**
   * Get the contextual thinking tool
   */
  getContextualThinkingTool(): ContextualThinkingTool {
    if (!this.initialized || !this.contextualThinkingTool) {
      throw new Error("Contextual thinking tool not initialized");
    }
    return this.contextualThinkingTool;
  }
}

/**
 * Extends the AgentToolsManager with the new agent execution system
 */
export class EnhancedAgentToolsManager extends AgentToolsManager {
  private agentExecutor: AgentExecutor | null = null;
  private adaptedTools: AgentTool[] = [];

  async initialize(serviceManager: unknown): Promise<void> {
    // Initialize base tools first
    await super.initialize(serviceManager);
    
    // Initialize agent executor
    this.agentExecutor = new AgentExecutor();
    
    // Create tool adapters and register them with the executor
    if (this.isInitialized()) {
      this.adaptedTools = createAgentTools(
        this.getVectorSearchTool(),
        this.getNoteNavigatorTool(),
        this.getQueryDecompositionTool(),
        this.getContextualThinkingTool()
      );
      
      // Register all tools with the executor
      for (const tool of this.adaptedTools) {
        this.agentExecutor.registerTool(tool);
      }
      
      log.info(`Enhanced agent system initialized with ${this.adaptedTools.length} tools`);
    }
  }
  
  /**
   * Get the agent executor
   */
  getAgentExecutor(): AgentExecutor {
    if (!this.agentExecutor) {
      throw new Error("Agent executor not initialized. Call initialize() first.");
    }
    return this.agentExecutor;
  }
  
  /**
   * Get all adapted tools for function calling
   */
  getAdaptedTools(): AgentTool[] {
    if (!this.isInitialized()) {
      throw new Error("Agent tools not initialized. Call initialize() first.");
    }
    return this.adaptedTools;
  }
}

// Export a singleton instance
const agentTools = new EnhancedAgentToolsManager();
export default agentTools;

// Also export individual tool classes and interfaces for direct use if needed
export {
  VectorSearchTool,
  NoteNavigatorTool,
  QueryDecompositionTool,
  ContextualThinkingTool,
  AgentTool,
  AgentExecutor
};
