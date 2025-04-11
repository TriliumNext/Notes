/**
 * Unified Context Service
 *
 * Consolidates functionality from:
 * - context_service.ts (old version)
 * - semantic_search.ts
 * - vector_search_stage.ts
 *
 * This service provides a central interface for all context extraction operations,
 * supporting both full and summarized note content extraction.
 */

import log from '../../../log.js';
import providerManager from '../modules/provider_manager.js';
import cacheManager from '../modules/cache_manager.js';
import vectorSearchService from './vector_search_service.js';
import queryProcessor from './query_processor.js';
import contextFormatter from '../modules/context_formatter.js';
import aiServiceManager from '../../ai_service_manager.js';
import { ContextExtractor } from '../index.js';
import { CONTEXT_PROMPTS } from '../../constants/llm_prompt_constants.js';
import type { NoteSearchResult } from '../../interfaces/context_interfaces.js';
import type { LLMServiceInterface } from '../../interfaces/agent_tool_interfaces.js';

// Options for context processing
export interface ContextOptions {
  // Content options
  summarizeContent?: boolean;
  maxResults?: number;
  contextNoteId?: string | null;

  // Processing options
  useQueryEnhancement?: boolean;
  useQueryDecomposition?: boolean;

  // Debugging options
  showThinking?: boolean;
}

export class ContextService {
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private contextExtractor: ContextExtractor;

  constructor() {
    this.contextExtractor = new ContextExtractor();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Use a promise to prevent multiple simultaneous initializations
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Initialize provider
        const provider = await providerManager.getPreferredEmbeddingProvider();
        if (!provider) {
          throw new Error(`No embedding provider available. Could not initialize context service.`);
        }

        // Initialize agent tools to ensure they're ready
        try {
          await aiServiceManager.getInstance().initializeAgentTools();
          log.info("Agent tools initialized for use with ContextService");
        } catch (toolError) {
          log.error(`Error initializing agent tools: ${toolError}`);
          // Continue even if agent tools fail to initialize
        }

        this.initialized = true;
        log.info(`Context service initialized with provider: ${provider.name}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`Failed to initialize context service: ${errorMessage}`);
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Process a user query to find relevant context in Trilium notes
   *
   * @param userQuestion - The user's query
   * @param llmService - The LLM service to use
   * @param options - Context processing options
   * @returns Context information and relevant notes
   */
  async processQuery(
    userQuestion: string,
    llmService: LLMServiceInterface,
    options: ContextOptions = {}
  ): Promise<{
    context: string;
    sources: NoteSearchResult[];
    thinking?: string;
    decomposedQuery?: any;
  }> {
    // Set default options
    const {
      summarizeContent = false,
      maxResults = 10,
      contextNoteId = null,
      useQueryEnhancement = true,
      useQueryDecomposition = false,
      showThinking = false
    } = options;

    log.info(`Processing query: "${userQuestion.substring(0, 50)}..."`);
    log.info(`Options: summarize=${summarizeContent}, maxResults=${maxResults}, contextNoteId=${contextNoteId || 'global'}`);
    log.info(`Processing: enhancement=${useQueryEnhancement}, decomposition=${useQueryDecomposition}, showThinking=${showThinking}`);

    if (!this.initialized) {
      try {
        await this.initialize();
      } catch (error) {
        log.error(`Failed to initialize ContextService: ${error}`);
        // Return a fallback response if initialization fails
        return {
          context: CONTEXT_PROMPTS.NO_NOTES_CONTEXT,
          sources: [],
          thinking: undefined
        };
      }
    }

    try {
      let decomposedQuery;
      let searchQueries: string[] = [userQuestion];
      let relevantNotes: NoteSearchResult[] = [];

      // Step 1: Decompose query if requested
      if (useQueryDecomposition) {
        log.info(`Decomposing query for better understanding`);
        decomposedQuery = queryProcessor.decomposeQuery(userQuestion);

        // Extract sub-queries to use for search
        if (decomposedQuery.subQueries.length > 0) {
          searchQueries = decomposedQuery.subQueries
            .map(sq => sq.text)
            .filter(text => text !== userQuestion); // Remove the original query to avoid duplication

          // Always include the original query
          searchQueries.unshift(userQuestion);

          log.info(`Query decomposed into ${searchQueries.length} search queries`);
        }
      }
      // Step 2: Or enhance query if requested
      else if (useQueryEnhancement) {
        try {
          log.info(`Enhancing query for better semantic matching`);
          searchQueries = await queryProcessor.generateSearchQueries(userQuestion, llmService);
          log.info(`Generated ${searchQueries.length} enhanced search queries`);
        } catch (error) {
          log.error(`Error generating search queries, using fallback: ${error}`);
          searchQueries = [userQuestion]; // Fallback to using the original question
        }
      }

      // Step 3: Find relevant notes using vector search
      const allResults = new Map<string, NoteSearchResult>();

      for (const query of searchQueries) {
        try {
          log.info(`Searching for: "${query.substring(0, 50)}..."`);

          // Use the unified vector search service
          const results = await vectorSearchService.findRelevantNotes(
            query,
            contextNoteId,
            {
              maxResults: maxResults,
              summarizeContent: summarizeContent,
              llmService: summarizeContent ? llmService : null
            }
          );

          log.info(`Found ${results.length} results for query "${query.substring(0, 30)}..."`);

          // Combine results, avoiding duplicates
          for (const result of results) {
            if (!allResults.has(result.noteId)) {
              allResults.set(result.noteId, result);
            } else {
              // If note already exists, update similarity to max of both values
              const existing = allResults.get(result.noteId);
              if (existing && result.similarity > existing.similarity) {
                existing.similarity = result.similarity;
                allResults.set(result.noteId, existing);
              }
            }
          }
        } catch (error) {
          log.error(`Error searching for query "${query}": ${error}`);
        }
      }

      // Convert to array and sort by similarity
      relevantNotes = Array.from(allResults.values())
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults);

      log.info(`Final combined results: ${relevantNotes.length} relevant notes`);

      // Step 4: Build context from the notes
      const provider = await providerManager.getPreferredEmbeddingProvider();
      const providerId = provider?.name || 'default';

      const context = await contextFormatter.buildContextFromNotes(
        relevantNotes,
        userQuestion,
        providerId
      );

      // Step 5: Add agent tools context if requested
      let enhancedContext = context;
      let thinkingProcess: string | undefined = undefined;

      if (showThinking) {
        thinkingProcess = this.generateThinkingProcess(
          userQuestion,
          searchQueries,
          relevantNotes,
          decomposedQuery
        );
      }

      return {
        context: enhancedContext,
        sources: relevantNotes,
        thinking: thinkingProcess,
        decomposedQuery
      };
    } catch (error) {
      log.error(`Error processing query: ${error}`);
      return {
        context: CONTEXT_PROMPTS.NO_NOTES_CONTEXT,
        sources: [],
        thinking: undefined
      };
    }
  }

  /**
   * Generate a thinking process for debugging and transparency
   */
  private generateThinkingProcess(
    originalQuery: string,
    searchQueries: string[],
    relevantNotes: NoteSearchResult[],
    decomposedQuery?: any
  ): string {
    let thinking = `## Query Processing\n\n`;
    thinking += `Original query: "${originalQuery}"\n\n`;

    // Add decomposition analysis if available
    if (decomposedQuery) {
      thinking += `Query complexity: ${decomposedQuery.complexity}/10\n\n`;
      thinking += `### Decomposed into ${decomposedQuery.subQueries.length} sub-queries:\n`;

      decomposedQuery.subQueries.forEach((sq: any, i: number) => {
        thinking += `${i+1}. ${sq.text}\n   Reason: ${sq.reason}\n\n`;
      });
    }

    // Add search queries
    thinking += `### Search Queries Used:\n`;
    searchQueries.forEach((q, i) => {
      thinking += `${i+1}. "${q}"\n`;
    });

    // Add found sources
    thinking += `\n## Sources Retrieved (${relevantNotes.length})\n\n`;

    relevantNotes.slice(0, 5).forEach((note, i) => {
      thinking += `${i+1}. "${note.title}" (Score: ${Math.round(note.similarity * 100)}%)\n`;
      thinking += `   ID: ${note.noteId}\n`;

      // Check if parentPath exists before using it
      if ('parentPath' in note && note.parentPath) {
        thinking += `   Path: ${note.parentPath}\n`;
      }

      if (note.content) {
        const contentPreview = note.content.length > 100
          ? note.content.substring(0, 100) + '...'
          : note.content;
        thinking += `   Preview: ${contentPreview}\n`;
      }

      thinking += '\n';
    });

    if (relevantNotes.length > 5) {
      thinking += `... and ${relevantNotes.length - 5} more sources\n`;
    }

    return thinking;
  }

  /**
   * Find notes semantically related to a query
   * (Shorthand method that directly uses vectorSearchService)
   */
  async findRelevantNotes(
    query: string,
    contextNoteId: string | null = null,
    options: {
      maxResults?: number,
      summarize?: boolean,
      llmService?: LLMServiceInterface | null
    } = {}
  ): Promise<NoteSearchResult[]> {
    return vectorSearchService.findRelevantNotes(
      query,
      contextNoteId,
      {
        maxResults: options.maxResults,
        summarizeContent: options.summarize,
        llmService: options.llmService
      }
    );
  }
}

// Export a singleton instance
export default new ContextService();
