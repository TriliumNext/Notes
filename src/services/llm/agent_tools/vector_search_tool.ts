/**
 * Vector Search Tool
 *
 * This tool enables the LLM agent to perform semantic vector-based searches
 * over the content in the notes database. It handles:
 * - Finding semantically related notes to a query
 * - Extracting relevant sections from notes
 * - Providing relevant context for LLM to generate accurate responses
 *
 * The tool uses embeddings to find notes with similar semantic meaning,
 * allowing the LLM to find relevant information even when exact keywords
 * are not present.
 */

import log from '../../log.js';
import type { ContextService } from '../context/modules/context_service.js';

// Define interface for context service to avoid circular imports
interface IContextService {
  findRelevantNotesMultiQuery(queries: string[], contextNoteId: string | null, limit: number): Promise<any[]>;
  processQuery(userQuestion: string, llmService: any, contextNoteId: string | null, showThinking: boolean): Promise<any>;
}

export interface VectorSearchResult {
  noteId: string;
  title: string;
  contentPreview: string;
  similarity: number;
  parentId?: string;
  dateCreated?: string;
  dateModified?: string;
}

export interface SearchResultItem {
  noteId: string;
  noteTitle: string;
  contentPreview: string;
  similarity: number;
  parentId?: string;
  dateCreated?: string;
  dateModified?: string;
}

export interface ChunkSearchResultItem {
  noteId: string;
  noteTitle: string;
  chunk: string;
  similarity: number;
  parentId?: string;
}

export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  includeContent?: boolean;
}

export class VectorSearchTool {
  private contextService: IContextService | null = null;
  private maxResults: number = 5;

  constructor() {
    // Initialization is done by setting context service
  }

  /**
   * Set the context service for performing vector searches
   */
  setContextService(contextService: IContextService): void {
    this.contextService = contextService;
    log.info('Context service set in VectorSearchTool');
  }

  /**
   * Perform a vector search for related notes
   */
  async search(
    query: string,
    contextNoteId?: string,
    searchOptions: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.contextService) {
      throw new Error("Context service not set, call setContextService() first");
    }

    try {
      // Set more aggressive defaults to return more content
      const options = {
        limit: searchOptions.limit || 15, // Increased from default (likely 5 or 10)
        threshold: searchOptions.threshold || 0.5, // Lower threshold to include more results (likely 0.65 or 0.7 before)
        includeContent: searchOptions.includeContent !== undefined ? searchOptions.includeContent : true,
        ...searchOptions
      };

      log.info(`Vector search: "${query.substring(0, 50)}..." with limit=${options.limit}, threshold=${options.threshold}`);

      // Check if contextService is set again to satisfy TypeScript
      if (!this.contextService) {
        throw new Error("Context service not set, call setContextService() first");
      }

      // Use contextService methods instead of direct imports
      const results = await this.contextService.findRelevantNotesMultiQuery(
        [query],
        contextNoteId || null,
        options.limit
      );

      // Log the number of results
      log.info(`Vector search found ${results.length} relevant notes`);

      // Include more content from each note to provide richer context
      if (options.includeContent) {
        // IMPORTANT: Get content directly without recursive processQuery calls
        // This prevents infinite loops where one search triggers another
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          try {
            // Get content directly from note content service
            if (!result.content) {
              const noteContent = await import('../context/note_content.js');
              const content = await noteContent.getNoteContent(result.noteId);
              if (content) {
                // Add content directly without recursive calls
                result.content = content.substring(0, 2000); // Limit to 2000 chars
                log.info(`Added direct content for note ${result.noteId}, length: ${result.content.length} chars`);
              }
            }
          } catch (error) {
            log.error(`Error getting content for note ${result.noteId}: ${error}`);
          }
        }
      }

      return results;
    } catch (error) {
      log.error(`Vector search error: ${error}`);
      return [];
    }
  }

  /**
   * Search for notes that are semantically related to the query
   */
  async searchNotes(query: string, options: {
    parentNoteId?: string,
    maxResults?: number,
    similarityThreshold?: number
  } = {}): Promise<VectorSearchResult[]> {
    try {
      // Validate contextService is set
      if (!this.contextService) {
        log.error('Context service not set in VectorSearchTool');
        return [];
      }

      // Set defaults
      const maxResults = options.maxResults || this.maxResults;
      const parentNoteId = options.parentNoteId || null;

      // Use multi-query approach for more robust results
      const queries = [query];
      const results = await this.contextService.findRelevantNotesMultiQuery(
        queries,
        parentNoteId,
        maxResults
      );

      // Format results to match the expected interface
      return results.map(result => ({
        noteId: result.noteId,
        title: result.title,
        contentPreview: result.content ?
          (result.content.length > 200 ?
            result.content.substring(0, 200) + '...' :
            result.content)
          : 'No content available',
        similarity: result.similarity,
        parentId: result.parentId
      }));
    } catch (error) {
      log.error(`Error in vector search: ${error}`);
      return [];
    }
  }

  /**
   * Search for content chunks that are semantically related to the query
   */
  async searchContentChunks(query: string, options: {
    noteId?: string,
    maxResults?: number,
    similarityThreshold?: number
  } = {}): Promise<VectorSearchResult[]> {
    try {
      // For now, use the same implementation as searchNotes,
      // but in the future we'll implement chunk-based search
      return this.searchNotes(query, {
        parentNoteId: options.noteId,
        maxResults: options.maxResults,
        similarityThreshold: options.similarityThreshold
      });
    } catch (error) {
      log.error(`Error in vector chunk search: ${error}`);
      return [];
    }
  }

  /**
   * Elaborate on why certain results were returned for a query
   */
  explainResults(query: string, results: VectorSearchResult[]): string {
    if (!query || !results || results.length === 0) {
      return "No results to explain.";
    }

    let explanation = `For query "${query}", I found these semantically related notes:\n\n`;

    results.forEach((result, index) => {
      explanation += `${index + 1}. "${result.title}" (similarity: ${(result.similarity * 100).toFixed(1)}%)\n`;
      explanation += `   Preview: ${result.contentPreview.substring(0, 150)}...\n`;

      if (index < results.length - 1) {
        explanation += "\n";
      }
    });

    explanation += "\nThese results were found based on semantic similarity rather than just keyword matching.";

    return explanation;
  }
}

export default VectorSearchTool;
