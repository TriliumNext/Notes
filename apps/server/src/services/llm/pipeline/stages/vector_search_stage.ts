/**
 * Vector Search Stage
 *
 * Part of the chat pipeline that handles finding semantically relevant notes
 * using vector similarity search.
 */

import log from '../../../log.js';
import vectorSearchService from '../../context/services/vector_search_service.js';
import type { NoteSearchResult } from '../../interfaces/context_interfaces.js';
import type { LLMServiceInterface } from '../../interfaces/agent_tool_interfaces.js';
import { SEARCH_CONSTANTS } from '../../constants/search_constants.js';

export interface VectorSearchInput {
  query: string;
  queries?: string[];
  noteId?: string;
  options?: {
    maxResults?: number;
    threshold?: number;
    useEnhancedQueries?: boolean;
    llmService?: LLMServiceInterface;
  };
}

export interface VectorSearchOutput {
  searchResults: NoteSearchResult[];
  originalQuery: string;
  noteId: string;
}

/**
 * Pipeline stage for performing vector-based semantic search
 */
export class VectorSearchStage {
  constructor() {
    log.info('VectorSearchStage initialized');
  }

  /**
   * Execute vector search to find relevant notes
   */
  async execute(input: VectorSearchInput): Promise<VectorSearchOutput> {
    const {
      query,
      queries = [],
      noteId = 'global',
      options = {}
    } = input;

    const {
      maxResults = SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_MAX_RESULTS,
      threshold = SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_THRESHOLD,
      useEnhancedQueries = false,
      llmService = undefined
    } = options;

    // If queries array is provided, use multi-query search
    if (queries && queries.length > 0) {
      log.info(`VectorSearchStage: Searching with ${queries.length} queries`);
      log.info(`Parameters: noteId=${noteId}, maxResults=${maxResults}, threshold=${threshold}`);

      try {
        // Use the new multi-query method
        const searchResults = await vectorSearchService.findRelevantNotesMultiQuery(
          queries,
          noteId === 'global' ? null : noteId,
          {
            maxResults,
            threshold,
            llmService: llmService || null
          }
        );

        log.info(`VectorSearchStage: Found ${searchResults.length} relevant notes from multi-query search`);

        return {
          searchResults,
          originalQuery: query,
          noteId
        };
      } catch (error) {
        log.error(`Error in vector search stage multi-query: ${error}`);
        // Return empty results on error
        return {
          searchResults: [],
          originalQuery: query,
          noteId
        };
      }
    }

    // Fallback to single query search
    log.info(`VectorSearchStage: Searching for "${query.substring(0, 50)}..."`);
    log.info(`Parameters: noteId=${noteId}, maxResults=${maxResults}, threshold=${threshold}`);

    try {
      // Find relevant notes using vector search service
      const searchResults = await vectorSearchService.findRelevantNotes(
        query,
        noteId === 'global' ? null : noteId,
        {
          maxResults,
          threshold,
          llmService: llmService || null
        }
      );

      log.info(`VectorSearchStage: Found ${searchResults.length} relevant notes`);

      return {
        searchResults,
        originalQuery: query,
        noteId
      };
    } catch (error) {
      log.error(`Error in vector search stage: ${error}`);
      // Return empty results on error
      return {
        searchResults: [],
        originalQuery: query,
        noteId
      };
    }
  }
}
