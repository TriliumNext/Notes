/**
 * Handler for LLM context management
 */
import log from "../../../log.js";
import becca from "../../../../becca/becca.js";
import vectorStore from "../../embeddings/index.js";
import providerManager from "../../providers/providers.js";
import contextService from "../../context/services/context_service.js";
import type { NoteSource } from "../../interfaces/chat_session.js";
import { SEARCH_CONSTANTS } from '../../constants/search_constants.js';

/**
 * Handles context management for LLM chat
 */
export class ContextHandler {
    /**
     * Find relevant notes based on search query
     * @param content The search content
     * @param contextNoteId Optional note ID for context
     * @param limit Maximum number of results to return
     * @returns Array of relevant note sources
     */
    static async findRelevantNotes(content: string, contextNoteId: string | null = null, limit = 5): Promise<NoteSource[]> {
        try {
            // If content is too short, don't bother
            if (content.length < 3) {
                return [];
            }

            // Check if embeddings are available
            const enabledProviders = await providerManager.getEnabledEmbeddingProviders();
            if (enabledProviders.length === 0) {
                log.info("No embedding providers available, can't find relevant notes");
                return [];
            }

            // Get the embedding for the query
            const provider = enabledProviders[0];
            const embedding = await provider.generateEmbeddings(content);

            let results;
            if (contextNoteId) {
                // For branch context, get notes specifically from that branch
                const contextNote = becca.notes[contextNoteId];
                if (!contextNote) {
                    return [];
                }

                const sql = require("../../../../services/sql.js").default;
                const childBranches = await sql.getRows(`
                    SELECT branches.* FROM branches
                    WHERE branches.parentNoteId = ?
                    AND branches.isDeleted = 0
                `, [contextNoteId]);

                const childNoteIds = childBranches.map((branch: any) => branch.noteId);

                // Include the context note itself
                childNoteIds.push(contextNoteId);

                // Find similar notes in this context
                results = [];

                for (const noteId of childNoteIds) {
                    const noteEmbedding = await vectorStore.getEmbeddingForNote(
                        noteId,
                        provider.name,
                        provider.getConfig().model
                    );

                    if (noteEmbedding) {
                        const similarity = vectorStore.cosineSimilarity(
                            embedding,
                            noteEmbedding.embedding
                        );

                        if (similarity > SEARCH_CONSTANTS.VECTOR_SEARCH.EXACT_MATCH_THRESHOLD) {
                            results.push({
                                noteId,
                                similarity
                            });
                        }
                    }
                }

                // Sort by similarity
                results.sort((a, b) => b.similarity - a.similarity);
                results = results.slice(0, limit);
            } else {
                // General search across all notes
                results = await vectorStore.findSimilarNotes(
                    embedding,
                    provider.name,
                    provider.getConfig().model,
                    limit
                );
            }

            // Format the results
            const sources: NoteSource[] = [];

            for (const result of results) {
                const note = becca.notes[result.noteId];
                if (!note) continue;

                let noteContent: string | undefined = undefined;
                if (note.type === 'text') {
                    const content = note.getContent();
                    // Handle both string and Buffer types
                    noteContent = typeof content === 'string' ? content :
                        content instanceof Buffer ? content.toString('utf8') : undefined;
                }

                sources.push({
                    noteId: result.noteId,
                    title: note.title,
                    content: noteContent,
                    similarity: result.similarity,
                    branchId: note.getBranches()[0]?.branchId
                });
            }

            return sources;
        } catch (error: any) {
            log.error(`Error finding relevant notes: ${error.message}`);
            return [];
        }
    }

    /**
     * Process enhanced context using the context service
     * @param query Query to process
     * @param contextNoteId Optional note ID for context
     * @param showThinking Whether to show thinking process
     */
    static async processEnhancedContext(query: string, llmService: any, options: {
        contextNoteId?: string,
        showThinking?: boolean
    }) {
        // Use the Trilium-specific approach
        const contextNoteId = options.contextNoteId || null;
        const showThinking = options.showThinking || false;

        // Log that we're calling contextService with the parameters
        log.info(`Using enhanced context with: noteId=${contextNoteId}, showThinking=${showThinking}`);

        // Call context service for processing
        const results = await contextService.processQuery(
            query,
            llmService,
            {
                contextNoteId,
                showThinking
            }
        );

        // Return the generated context and sources
        return {
            context: results.context,
            sources: results.sources.map(source => ({
                noteId: source.noteId,
                title: source.title,
                content: source.content || undefined, // Convert null to undefined
                similarity: source.similarity
            }))
        };
    }
}
