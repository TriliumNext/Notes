/**
 * Trilium Notes Context Service
 *
 * Unified entry point for all context-related services
 * Provides intelligent context management for AI features
 */

import log from '../log.js';
import contextService from './context/modules/context_service.js';
import { ContextExtractor } from './context/index.js';

/**
 * Main Context Service for Trilium Notes
 *
 * This service provides a unified interface for all context-related functionality:
 * - Processing user queries with semantic search
 * - Finding relevant notes using AI-enhanced query understanding
 * - Progressive context loading based on query complexity
 * - Semantic context extraction
 * - Context formatting for different LLM providers
 *
 * This implementation uses a modular approach with specialized services:
 * - Provider management
 * - Cache management
 * - Semantic search
 * - Query enhancement
 * - Context formatting
 */
class TriliumContextService {
    private contextExtractor: ContextExtractor;

    constructor() {
        this.contextExtractor = new ContextExtractor();
        log.info('TriliumContextService created');
    }

    /**
     * Initialize the context service
     */
    async initialize(): Promise<void> {
        return contextService.initialize();
    }

    /**
     * Process a user query to find relevant context in Trilium notes
     *
     * @param userQuestion - The user's query
     * @param llmService - The LLM service to use for query enhancement
     * @param contextNoteId - Optional note ID to restrict search to a branch
     * @param showThinking - Whether to show the LLM's thinking process
     * @returns Context information and relevant notes
     */
    async processQuery(
        userQuestion: string,
        llmService: any,
        contextNoteId: string | null = null,
        showThinking: boolean = false
    ) {
        return contextService.processQuery(userQuestion, llmService, contextNoteId, showThinking);
    }

    /**
     * Get context enhanced with agent tools
     *
     * @param noteId - The current note ID
     * @param query - The user's query
     * @param showThinking - Whether to show thinking process
     * @param relevantNotes - Optional pre-found relevant notes
     * @returns Enhanced context string
     */
    async getAgentToolsContext(
        noteId: string,
        query: string,
        showThinking: boolean = false,
        relevantNotes: Array<any> = []
    ): Promise<string> {
        return contextService.getAgentToolsContext(noteId, query, showThinking, relevantNotes);
    }

    /**
     * Build formatted context from notes
     *
     * @param sources - Array of notes or content sources
     * @param query - The original user query
     * @returns Formatted context string
     */
    async buildContextFromNotes(sources: any[], query: string): Promise<string> {
        const provider = await (await import('./context/modules/provider_manager.js')).default.getPreferredEmbeddingProvider();
        const providerId = provider?.name || 'default';
        return (await import('./context/modules/context_formatter.js')).default.buildContextFromNotes(sources, query, providerId);
    }

    /**
     * Find relevant notes using multi-query approach
     *
     * @param queries - Array of search queries
     * @param contextNoteId - Optional note ID to restrict search
     * @param limit - Maximum notes to return
     * @returns Array of relevant notes
     */
    async findRelevantNotesMultiQuery(
        queries: string[],
        contextNoteId: string | null = null,
        limit = 10
    ): Promise<any[]> {
        const allResults: Map<string, any> = new Map();

        for (const query of queries) {
            const results = await (await import('./context/modules/semantic_search.js')).default.findRelevantNotes(
                query,
                contextNoteId,
                Math.ceil(limit / queries.length) // Distribute limit among queries
            );

            // Combine results, avoiding duplicates
            for (const result of results) {
                if (!allResults.has(result.noteId)) {
                    allResults.set(result.noteId, result);
                } else {
                    // If note already exists, update similarity to max of both values
                    const existing = allResults.get(result.noteId);
                    if (result.similarity > existing.similarity) {
                        existing.similarity = result.similarity;
                        allResults.set(result.noteId, existing);
                    }
                }
            }
        }

        // Convert map to array and limit to top results
        return Array.from(allResults.values())
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Generate search queries to find relevant information
     *
     * @param userQuestion - The user's question
     * @param llmService - The LLM service to use for generating queries
     * @returns Array of search queries
     */
    async generateSearchQueries(userQuestion: string, llmService: any): Promise<string[]> {
        return (await import('./context/modules/query_enhancer.js')).default.generateSearchQueries(userQuestion, llmService);
    }

    /**
     * Get semantic context for a note
     *
     * @param noteId - The note ID
     * @param userQuery - The user's query
     * @param maxResults - Maximum results to include
     * @returns Formatted context string
     */
    async getSemanticContext(noteId: string, userQuery: string, maxResults = 5): Promise<string> {
        return contextService.getSemanticContext(noteId, userQuery, maxResults);
    }

    /**
     * Get progressive context based on depth level
     *
     * @param noteId - The note ID
     * @param depth - Depth level (1-4)
     * @returns Context string
     */
    async getProgressiveContext(noteId: string, depth = 1): Promise<string> {
        return contextService.getProgressiveContext(noteId, depth);
    }

    /**
     * Get smart context that adapts to query complexity
     *
     * @param noteId - The note ID
     * @param userQuery - The user's query
     * @returns Context string
     */
    async getSmartContext(noteId: string, userQuery: string): Promise<string> {
        return contextService.getSmartContext(noteId, userQuery);
    }

    /**
     * Clear all context caches
     */
    clearCaches(): void {
        return contextService.clearCaches();
    }
}

// Export singleton instance
export default new TriliumContextService();
