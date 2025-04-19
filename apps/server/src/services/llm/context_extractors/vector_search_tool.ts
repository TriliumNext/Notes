/**
 * Vector Search Tool
 *
 * This tool enables the LLM agent to perform semantic vector-based searches
 * over the content in the notes database. It handles:
 * - Finding semantically related notes to a query
 * - Extracting relevant sections from notes
 * - Providing relevant context for LLM to generate accurate responses
 *
 * Updated to use the consolidated VectorSearchService
 */

import log from '../../log.js';
import type { ContextService } from '../context/services/context_service.js';
import vectorSearchService from '../context/services/vector_search_service.js';

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

export interface VectorSearchOptions {
    limit?: number;
    threshold?: number;
    includeContent?: boolean;
    summarize?: boolean;
}

// Define a type for the context service
export interface IVectorContextService {
    findRelevantNotes?: (query: string, contextNoteId: string | null, options: Record<string, unknown>) => Promise<unknown[]>;
}

export class VectorSearchTool {
    private contextService: IVectorContextService | null = null;
    private maxResults: number = 5;

    constructor() {
        log.info('VectorSearchTool initialized using consolidated VectorSearchService');
    }

    /**
     * Set the context service for performing vector searches
     */
    setContextService(contextService: IVectorContextService): void {
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
        try {
            // Set more aggressive defaults to return more content
            const options = {
                maxResults: searchOptions.limit || 15, // Increased from default
                threshold: searchOptions.threshold || 0.5, // Lower threshold to include more results
                includeContent: searchOptions.includeContent !== undefined ? searchOptions.includeContent : true,
                summarizeContent: searchOptions.summarize || false,
                ...searchOptions
            };

            log.info(`Vector search: "${query.substring(0, 50)}..." with limit=${options.maxResults}, threshold=${options.threshold}`);

            // Use the consolidated vector search service
            const searchResults = await vectorSearchService.findRelevantNotes(
                query,
                contextNoteId || null,
                {
                    maxResults: options.maxResults,
                    threshold: options.threshold,
                    summarizeContent: options.summarizeContent
                }
            );

            log.info(`Vector search found ${searchResults.length} relevant notes`);

            // Format results to match the expected VectorSearchResult interface
            return searchResults.map(note => ({
                noteId: note.noteId,
                title: note.title,
                contentPreview: note.content
                    ? (options.summarizeContent
                        // Don't truncate already summarized content
                        ? note.content
                        // Only truncate non-summarized content
                        : (note.content.length > 200
                            ? note.content.substring(0, 200) + '...'
                            : note.content))
                    : 'No content available',
                similarity: note.similarity,
                parentId: note.parentId
            }));
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
        similarityThreshold?: number,
        summarize?: boolean
    } = {}): Promise<VectorSearchResult[]> {
        try {
            // Set defaults
            const maxResults = options.maxResults || this.maxResults;
            const threshold = options.similarityThreshold || 0.6;
            const parentNoteId = options.parentNoteId || null;
            const summarize = options.summarize || false;

            // Use the consolidated vector search service
            const results = await vectorSearchService.findRelevantNotes(
                query,
                parentNoteId,
                {
                    maxResults,
                    threshold,
                    summarizeContent: summarize
                }
            );

            // Format results to match the expected interface
            return results.map(result => ({
                noteId: result.noteId,
                title: result.title,
                contentPreview: result.content
                    ? (summarize
                        // Don't truncate already summarized content
                        ? result.content
                        // Only truncate non-summarized content
                        : (result.content.length > 200
                            ? result.content.substring(0, 200) + '...'
                            : result.content))
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
        similarityThreshold?: number,
        summarize?: boolean
    } = {}): Promise<VectorSearchResult[]> {
        try {
            // For now, use the same implementation as searchNotes,
            // but in the future we'll implement chunk-based search
            return this.searchNotes(query, {
                parentNoteId: options.noteId,
                maxResults: options.maxResults,
                similarityThreshold: options.similarityThreshold,
                summarize: options.summarize
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

export default new VectorSearchTool();
