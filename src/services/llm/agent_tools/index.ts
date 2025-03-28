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

// Import services needed for initialization
import contextService from '../context_service.js';
import aiServiceManager from '../ai_service_manager.js';
import log from '../../log.js';

// Import interfaces
import type {
  IAgentToolsManager,
  LLMServiceInterface,
  IVectorSearchTool,
  INoteNavigatorTool,
  IQueryDecompositionTool,
  IContextualThinkingTool
} from '../interfaces/agent_tool_interfaces.js';

/**
 * Manages all agent tools and provides a unified interface for the LLM agent
 */
export class AgentToolsManager implements IAgentToolsManager {
  private vectorSearchTool: VectorSearchTool | null = null;
  private noteNavigatorTool: NoteNavigatorTool | null = null;
  private queryDecompositionTool: QueryDecompositionTool | null = null;
  private contextualThinkingTool: ContextualThinkingTool | null = null;
  private initialized = false;

  constructor() {
    // Initialize tools only when requested to avoid circular dependencies
  }

  async initialize(aiServiceManager: LLMServiceInterface): Promise<void> {
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
      log.error(`Failed to initialize agent tools: ${error}`);
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
      vectorSearch: this.vectorSearchTool as IVectorSearchTool,
      noteNavigator: this.noteNavigatorTool as INoteNavigatorTool,
      queryDecomposition: this.queryDecompositionTool as IQueryDecompositionTool,
      contextualThinking: this.contextualThinkingTool as IContextualThinkingTool
    };
  }

  /**
   * Get the vector search tool
   */
  getVectorSearchTool(): IVectorSearchTool {
    if (!this.initialized || !this.vectorSearchTool) {
      throw new Error("Vector search tool not initialized");
    }
    return this.vectorSearchTool;
  }

  /**
   * Get the note structure navigator tool
   */
  getNoteNavigatorTool(): INoteNavigatorTool {
    if (!this.initialized || !this.noteNavigatorTool) {
      throw new Error("Note navigator tool not initialized");
    }
    return this.noteNavigatorTool;
  }

  /**
   * Get the query decomposition tool
   */
  getQueryDecompositionTool(): IQueryDecompositionTool {
    if (!this.initialized || !this.queryDecompositionTool) {
      throw new Error("Query decomposition tool not initialized");
    }
    return this.queryDecompositionTool;
  }

  /**
   * Get the contextual thinking tool
   */
  getContextualThinkingTool(): IContextualThinkingTool {
    if (!this.initialized || !this.contextualThinkingTool) {
      throw new Error("Contextual thinking tool not initialized");
    }
    return this.contextualThinkingTool;
  }
}

// Export a singleton instance
const agentTools = new AgentToolsManager();
export default agentTools;

// Also export individual tool classes for direct use if needed
export {
  VectorSearchTool,
  NoteNavigatorTool,
  QueryDecompositionTool,
  ContextualThinkingTool
};
