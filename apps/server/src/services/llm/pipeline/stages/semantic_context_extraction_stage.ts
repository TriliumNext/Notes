import { BasePipelineStage } from '../pipeline_stage.js';
import type { SemanticContextExtractionInput } from '../interfaces.js';
import aiServiceManager from '../../ai_service_manager.js';
import log from '../../../log.js';
import { VectorSearchStage } from './vector_search_stage.js';
import contextFormatter from '../../context/modules/context_formatter.js';
import providerManager from '../../context/modules/provider_manager.js';
import type { NoteSearchResult } from '../../interfaces/context_interfaces.js';
import type { Message } from '../../ai_interface.js';
import { SEARCH_CONSTANTS } from "../../constants/search_constants.js";

/**
 * Pipeline stage for extracting semantic context from notes
 * This uses the new VectorSearchStage to find relevant content
 */
export class SemanticContextExtractionStage extends BasePipelineStage<SemanticContextExtractionInput, { context: string }> {
    private vectorSearchStage: VectorSearchStage;

    constructor() {
        super('SemanticContextExtraction');
        this.vectorSearchStage = new VectorSearchStage();
    }

    /**
     * Extract semantic context based on a query
     */
    protected async process(input: SemanticContextExtractionInput): Promise<{ context: string }> {
        const { noteId, query, maxResults = 5, messages = [] } = input;
        log.info(`Extracting semantic context from note ${noteId}, query: ${query?.substring(0, 50)}...`);

        try {
            // Step 1: Use vector search stage to find relevant notes
            const vectorSearchResult = await this.vectorSearchStage.execute({
                query,
                noteId,
                options: {
                    maxResults,
                    useEnhancedQueries: true,
                    threshold: SEARCH_CONSTANTS.VECTOR_SEARCH.DEFAULT_THRESHOLD,
                    llmService: undefined // Let the vectorSearchStage use the default service
                }
            });

            log.info(`Vector search found ${vectorSearchResult.searchResults.length} relevant notes`);

            // If no results, return empty context
            if (vectorSearchResult.searchResults.length === 0) {
                log.info(`No relevant notes found for context extraction`);
                return { context: "" };
            }

            // Step 2: Format search results into a context string
            const provider = await providerManager.getPreferredEmbeddingProvider();
            const providerId = provider?.name || 'default';

            const context = await contextFormatter.buildContextFromNotes(
                vectorSearchResult.searchResults,
                query,
                providerId,
                messages
            );

            log.info(`Built context of ${context.length} chars from ${vectorSearchResult.searchResults.length} notes`);
            return { context };
        } catch (error) {
            log.error(`Error extracting semantic context: ${error}`);
            return { context: "" };
        }
    }
}
