/**
 * Unified Vector Search Service
 *
 * Consolidates functionality from:
 * - semantic_search.ts
 * - vector_search_stage.ts
 *
 * This service provides a central interface for all vector search operations,
 * supporting both full and summarized note context extraction.
 */

import * as vectorStore from '../../embeddings/index.js';
import { cosineSimilarity } from '../../embeddings/index.js';
import log from '../../../log.js';
import becca from '../../../../becca/becca.js';
import providerManager from '../modules/provider_manager.js';
import cacheManager from '../modules/cache_manager.js';
import type { NoteSearchResult } from '../../interfaces/context_interfaces.js';
import type { LLMServiceInterface } from '../../interfaces/agent_tool_interfaces.js';
import { SEARCH_CONSTANTS } from '../../constants/search_constants.js';

export interface VectorSearchOptions {
    maxResults?: number;
    threshold?: number;
    useEnhancedQueries?: boolean;
    summarizeContent?: boolean;
    llmService?: LLMServiceInterface | null;
}

export class VectorSearchService {
    private contextExtractor: any;

    constructor() {
        // Lazy load the context extractor to avoid circular dependencies
        import('../index.js').then(module => {
            this.contextExtractor = new module.ContextExtractor();
        });
    }

    /**
     * Find notes that are semantically relevant to a query
     *
     * @param query - The search query
     * @param contextNoteId - Optional note ID to restrict search to a branch
     * @param options - Search options including result limit and summarization preference
     * @returns Array of relevant notes with similarity scores
     */
    async findRelevantNotes(
        query: string,
        contextNoteId: string | null = null,
        options: VectorSearchOptions = {}
    ): Promise<NoteSearchResult[]> {
        const {
            maxResults = SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_MAX_RESULTS,
            threshold = SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_THRESHOLD,
            useEnhancedQueries = false,
            summarizeContent = false,
            llmService = null
        } = options;

        log.info(`VectorSearchService: Finding relevant notes for "${query}"`);
        log.info(`Parameters: contextNoteId=${contextNoteId || 'global'}, maxResults=${maxResults}, summarize=${summarizeContent}`);

        try {
            // Check cache first
            const cacheKey = `find:${query}:${contextNoteId || 'all'}:${maxResults}:${summarizeContent}`;
            const cached = cacheManager.getQueryResults<NoteSearchResult[]>(cacheKey);
            if (cached && Array.isArray(cached)) {
                log.info(`VectorSearchService: Returning ${cached.length} cached results`);
                return cached;
            }

            // Get embedding for query
            const queryEmbedding = await providerManager.generateQueryEmbedding(query);
            if (!queryEmbedding) {
                log.error('Failed to generate query embedding');
                return [];
            }

            // Get provider information
            const provider = await providerManager.getPreferredEmbeddingProvider();
            if (!provider) {
                log.error('No embedding provider available');
                return [];
            }

            // Find similar notes based on embeddings
            let noteResults: { noteId: string, similarity: number }[] = [];

            // If contextNoteId is provided, search only within that branch
            if (contextNoteId) {
                noteResults = await this.findNotesInBranch(
                    queryEmbedding,
                    contextNoteId,
                    maxResults
                );
            } else {
                // Otherwise search across all notes with embeddings
                noteResults = await vectorStore.findSimilarNotes(
                    queryEmbedding,
                    provider.name,
                    provider.getConfig().model || '',
                    maxResults
                );
            }

            // Ensure context extractor is loaded
            if (!this.contextExtractor) {
                const module = await import('../index.js');
                this.contextExtractor = new module.ContextExtractor();
            }

            // Get note details for results
            const enrichedResults = await Promise.all(
                noteResults.map(async result => {
                    const note = becca.getNote(result.noteId);
                    if (!note) {
                        return null;
                    }

                    // Get note content - full or summarized based on option
                    let content: string | null = null;

                    if (summarizeContent) {
                        content = await this.getSummarizedNoteContent(result.noteId, llmService);
                    } else {
                        content = await this.contextExtractor.getNoteContent(result.noteId);
                    }

                    // Adjust similarity score based on content quality
                    let adjustedSimilarity = result.similarity;

                    // Penalize notes with empty or minimal content
                    if (!content || content.trim().length <= 10) {
                        adjustedSimilarity *= 0.2;
                    }
                    // Slightly boost notes with substantial content
                    else if (content.length > 100) {
                        adjustedSimilarity = Math.min(1.0, adjustedSimilarity * 1.1);
                    }

                    // Get primary parent note ID
                    const parentNotes = note.getParentNotes();
                    const parentId = parentNotes.length > 0 ? parentNotes[0].noteId : undefined;

                    // Create parent chain for context
                    const parentPath = await this.getParentPath(result.noteId);

                    return {
                        noteId: result.noteId,
                        title: note.title,
                        content,
                        similarity: adjustedSimilarity,
                        parentId,
                        parentPath
                    };
                })
            );

            // Filter out null results and notes with very low similarity
            const filteredResults = enrichedResults.filter(result =>
                result !== null && result.similarity > threshold
            ) as NoteSearchResult[];

            // Sort results by adjusted similarity
            filteredResults.sort((a, b) => b.similarity - a.similarity);

            // Limit to requested number of results
            const limitedResults = filteredResults.slice(0, maxResults);

            // Cache results
            cacheManager.storeQueryResults(cacheKey, limitedResults);

            log.info(`VectorSearchService: Found ${limitedResults.length} relevant notes`);
            return limitedResults;
        } catch (error) {
            log.error(`Error finding relevant notes: ${error}`);
            return [];
        }
    }

    /**
     * Get a summarized version of note content
     *
     * @param noteId - The note ID to summarize
     * @param llmService - Optional LLM service for summarization
     * @returns Summarized content or full content if summarization fails
     */
    private async getSummarizedNoteContent(
        noteId: string,
        llmService: LLMServiceInterface | null
    ): Promise<string | null> {
        try {
            // Get the full content first
            const fullContent = await this.contextExtractor.getNoteContent(noteId);
            if (!fullContent || fullContent.length < 500) {
                // Don't summarize short content
                return fullContent;
            }

            // Check if we have an LLM service for summarization
            if (!llmService) {
                // If no LLM service, truncate the content instead
                return fullContent.substring(0, 500) + "...";
            }

            // Check cache for summarized content
            const cacheKey = `summary:${noteId}:${fullContent.length}`;
            const cached = cacheManager.getNoteData(noteId, cacheKey);
            if (cached) {
                return cached as string;
            }

            const note = becca.getNote(noteId);
            if (!note) return null;

            // Prepare a summarization prompt
            const messages = [
                {
                    role: "system" as const,
                    content: "Summarize the following note content concisely while preserving key information. Keep your summary to about 20% of the original length."
                },
                {
                    role: "user" as const,
                    content: `Note title: ${note.title}\n\nContent:\n${fullContent}`
                }
            ];

            // Request summarization with safeguards to prevent recursion
            const result = await llmService.generateChatCompletion(messages, {
                temperature: SEARCH_CONSTANTS.TEMPERATURE.VECTOR_SEARCH,
                maxTokens: SEARCH_CONSTANTS.LIMITS.VECTOR_SEARCH_MAX_TOKENS,
                // Use any to bypass type checking for these special options
                // that are recognized by the LLM service but not in the interface
                ...(({
                    bypassFormatter: true,
                    bypassContextProcessing: true,
                    enableTools: false
                } as any))
            });

            const summary = result.text;

            // Cache the summarization result
            cacheManager.storeNoteData(noteId, cacheKey, summary);

            return summary;
        } catch (error) {
            log.error(`Error summarizing note content: ${error}`);
            // Fall back to getting the full content
            return this.contextExtractor.getNoteContent(noteId);
        }
    }

    /**
     * Find notes in a specific branch (subtree) that are relevant to a query
     *
     * @param embedding - The query embedding
     * @param contextNoteId - Root note ID of the branch
     * @param limit - Maximum results to return
     * @returns Array of note IDs with similarity scores
     */
    private async findNotesInBranch(
        embedding: Float32Array,
        contextNoteId: string,
        limit = SEARCH_CONSTANTS.CONTEXT.MAX_SIMILAR_NOTES
    ): Promise<{ noteId: string, similarity: number }[]> {
        try {
            // Get all notes in the subtree
            const noteIds = await this.getSubtreeNoteIds(contextNoteId);

            if (noteIds.length === 0) {
                return [];
            }

            // Get provider information
            const provider = await providerManager.getPreferredEmbeddingProvider();
            if (!provider) {
                log.error('No embedding provider available');
                return [];
            }

            // Get model configuration
            const model = provider.getConfig().model || '';
            const providerName = provider.name;

            // Get embeddings for all notes in the branch
            const results: { noteId: string, similarity: number }[] = [];

            for (const noteId of noteIds) {
                try {
                    // Get note embedding
                    const embeddingResult = await vectorStore.getEmbeddingForNote(
                        noteId,
                        providerName,
                        model
                    );

                    if (embeddingResult && embeddingResult.embedding) {
                        // Calculate similarity
                        const similarity = cosineSimilarity(embedding, embeddingResult.embedding);
                        results.push({ noteId, similarity });
                    }
                } catch (error) {
                    log.error(`Error processing note ${noteId} for branch search: ${error}`);
                }
            }

            // Sort by similarity and return top results
            return results
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        } catch (error) {
            log.error(`Error in branch search: ${error}`);
            return [];
        }
    }

    /**
     * Get all note IDs in a subtree (branch)
     *
     * @param rootNoteId - The root note ID of the branch
     * @returns Array of note IDs in the subtree
     */
    private async getSubtreeNoteIds(rootNoteId: string): Promise<string[]> {
        try {
            const note = becca.getNote(rootNoteId);
            if (!note) return [];

            const noteIds = new Set<string>([rootNoteId]);
            const processChildNotes = async (noteId: string) => {
                const childNotes = becca.getNote(noteId)?.getChildNotes() || [];
                for (const childNote of childNotes) {
                    if (!noteIds.has(childNote.noteId)) {
                        noteIds.add(childNote.noteId);
                        await processChildNotes(childNote.noteId);
                    }
                }
            };

            await processChildNotes(rootNoteId);
            return Array.from(noteIds);
        } catch (error) {
            log.error(`Error getting subtree note IDs: ${error}`);
            return [];
        }
    }

    /**
     * Get the parent path for a note (for additional context)
     *
     * @param noteId - The note ID to get the parent path for
     * @returns String representation of the parent path
     */
    private async getParentPath(noteId: string): Promise<string> {
        try {
            const note = becca.getNote(noteId);
            if (!note) return '';

            const path: string[] = [];
            const parentNotes = note.getParentNotes();
            let currentNote = parentNotes.length > 0 ? parentNotes[0] : null;

            // Build path up to the maximum parent depth
            let level = 0;
            while (currentNote && level < SEARCH_CONSTANTS.CONTEXT.MAX_PARENT_DEPTH) {
                path.unshift(currentNote.title);
                const grandParents = currentNote.getParentNotes();
                currentNote = grandParents.length > 0 ? grandParents[0] : null;
                level++;
            }

            return path.join(' > ');
        } catch (error) {
            log.error(`Error getting parent path: ${error}`);
            return '';
        }
    }

    /**
     * Find notes that are semantically relevant to multiple queries
     * Combines results from multiple queries, deduplicates them, and returns the most relevant ones
     *
     * @param queries - Array of search queries
     * @param contextNoteId - Optional note ID to restrict search to a branch
     * @param options - Search options including result limit and summarization preference
     * @returns Array of relevant notes with similarity scores, deduplicated and sorted
     */
    async findRelevantNotesMultiQuery(
        queries: string[],
        contextNoteId: string | null = null,
        options: VectorSearchOptions = {}
    ): Promise<NoteSearchResult[]> {
        if (!queries || queries.length === 0) {
            log.info('No queries provided to findRelevantNotesMultiQuery');
            return [];
        }

        log.info(`VectorSearchService: Finding relevant notes for ${queries.length} queries`);
        log.info(`Multi-query parameters: contextNoteId=${contextNoteId || 'global'}, queries=${JSON.stringify(queries.map(q => q.substring(0, 20) + '...'))}`);

        try {
            // Create a Map to deduplicate results across queries
            const allResults = new Map<string, NoteSearchResult>();

            // For each query, adjust maxResults to avoid getting too many total results
            const adjustedMaxResults = options.maxResults ?
                Math.ceil(options.maxResults / queries.length) :
                Math.ceil(SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_MAX_RESULTS / queries.length);

            // Search for each query and combine results
            for (const query of queries) {
                try {
                    const queryOptions = {
                        ...options,
                        maxResults: adjustedMaxResults,
                        useEnhancedQueries: false // We're already using enhanced queries
                    };

                    const results = await this.findRelevantNotes(query, contextNoteId, queryOptions);

                    // Merge results, keeping the highest similarity score for duplicates
                    for (const note of results) {
                        if (!allResults.has(note.noteId) ||
                            (allResults.has(note.noteId) && note.similarity > (allResults.get(note.noteId)?.similarity || 0))) {
                            allResults.set(note.noteId, note);
                        }
                    }

                    log.info(`Found ${results.length} results for query: "${query.substring(0, 30)}..."`);
                } catch (error) {
                    log.error(`Error searching for query "${query}": ${error}`);
                }
            }

            // Convert map to array and sort by similarity
            const combinedResults = Array.from(allResults.values())
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, options.maxResults || SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_MAX_RESULTS);

            log.info(`VectorSearchService: Found ${combinedResults.length} total deduplicated results across ${queries.length} queries`);

            return combinedResults;
        } catch (error) {
            log.error(`Error in findRelevantNotesMultiQuery: ${error}`);
            return [];
        }
    }
}

// Export a singleton instance
export default new VectorSearchService();
