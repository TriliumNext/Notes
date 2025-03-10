import becca from "../../becca/becca.js";
import vectorStore from "./embeddings/vector_store.js";
import providerManager from "./embeddings/providers.js";
import options from "../options.js";
import log from "../log.js";
import type { Message } from "./ai_interface.js";
import { cosineSimilarity } from "./embeddings/vector_store.js";

/**
 * TriliumContextService provides intelligent context management for working with large knowledge bases
 * through limited context window LLMs like Ollama.
 *
 * It creates a "meta-prompting" approach where the first LLM call is used
 * to determine what information might be needed to answer the query,
 * then only the relevant context is loaded, before making the final
 * response.
 */
class TriliumContextService {
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private provider: any = null;

    // Cache for recently used context to avoid repeated embedding lookups
    private recentQueriesCache = new Map<string, {
        timestamp: number,
        relevantNotes: any[]
    }>();

    // Configuration
    private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes
    private metaPrompt = `You are an AI assistant that decides what information needs to be retrieved from a knowledge base to answer the user's question.
Given the user's question, generate 3-5 specific search queries that would help find relevant information.
Each query should be focused on a different aspect of the question.
Format your answer as a JSON array of strings, with each string being a search query.
Example: ["exact topic mentioned", "related concept 1", "related concept 2"]`;

    constructor() {
        this.setupCacheCleanup();
    }

    /**
     * Initialize the service
     */
    async initialize() {
        if (this.initialized) return;

        // Use a promise to prevent multiple simultaneous initializations
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const providerId = await options.getOption('embeddingsDefaultProvider') || 'ollama';
                this.provider = providerManager.getEmbeddingProvider(providerId);

                if (!this.provider) {
                    throw new Error(`Embedding provider ${providerId} not found`);
                }

                this.initialized = true;
                log.info(`Trilium context service initialized with provider: ${providerId}`);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log.error(`Failed to initialize Trilium context service: ${errorMessage}`);
                throw error;
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Set up periodic cache cleanup
     */
    private setupCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, data] of this.recentQueriesCache.entries()) {
                if (now - data.timestamp > this.cacheExpiryMs) {
                    this.recentQueriesCache.delete(key);
                }
            }
        }, 60000); // Run cleanup every minute
    }

    /**
     * Generate search queries to find relevant information for the user question
     * @param userQuestion - The user's question
     * @param llmService - The LLM service to use for generating queries
     * @returns Array of search queries
     */
    async generateSearchQueries(userQuestion: string, llmService: any): Promise<string[]> {
        try {
            const messages: Message[] = [
                { role: "system", content: this.metaPrompt },
                { role: "user", content: userQuestion }
            ];

            const options = {
                temperature: 0.3,
                maxTokens: 300
            };

            // Get the response from the LLM using the correct method name
            const response = await llmService.generateChatCompletion(messages, options);
            const responseText = response.text; // Extract the text from the response object

            try {
                // Parse the JSON response
                const jsonStr = responseText.trim().replace(/```json|```/g, '').trim();
                const queries = JSON.parse(jsonStr);

                if (Array.isArray(queries) && queries.length > 0) {
                    return queries;
                } else {
                    throw new Error("Invalid response format");
                }
            } catch (parseError) {
                // Fallback: if JSON parsing fails, try to extract queries line by line
                const lines = responseText.split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) => line.length > 0 && !line.startsWith('```'));

                if (lines.length > 0) {
                    return lines.map((line: string) => line.replace(/^["'\d\.\-\s]+/, '').trim());
                }

                // If all else fails, just use the original question
                return [userQuestion];
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`Error generating search queries: ${errorMessage}`);
            // Fallback to just using the original question
            return [userQuestion];
        }
    }

    /**
     * Find relevant notes using multiple search queries
     * @param queries - Array of search queries
     * @param contextNoteId - Optional note ID to restrict search to a branch
     * @param limit - Max notes to return
     * @returns Array of relevant notes
     */
    async findRelevantNotesMultiQuery(
        queries: string[],
        contextNoteId: string | null = null,
        limit = 10
    ): Promise<any[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Cache key combining all queries
            const cacheKey = JSON.stringify({ queries, contextNoteId, limit });

            // Check if we have a recent cache hit
            const cached = this.recentQueriesCache.get(cacheKey);
            if (cached) {
                return cached.relevantNotes;
            }

            // Array to store all results with their similarity scores
            const allResults: {
                noteId: string,
                title: string,
                content: string | null,
                similarity: number,
                branchId?: string
            }[] = [];

            // Set to keep track of note IDs we've seen to avoid duplicates
            const seenNoteIds = new Set<string>();

            // Process each query
            for (const query of queries) {
                // Get embeddings for this query using the correct method name
                const queryEmbedding = await this.provider.generateEmbeddings(query);

                // Find notes similar to this query
                let results;
                if (contextNoteId) {
                    // Find within a specific context/branch
                    results = await this.findNotesInBranch(
                        queryEmbedding,
                        contextNoteId,
                        Math.min(limit, 5) // Limit per query
                    );
                } else {
                    // Search all notes
                    results = await vectorStore.findSimilarNotes(
                        queryEmbedding,
                        this.provider.name, // Use name property instead of id
                        this.provider.getConfig().model, // Use getConfig().model instead of modelId
                        Math.min(limit, 5), // Limit per query
                        0.5 // Lower threshold to get more diverse results
                    );
                }

                // Process results
                for (const result of results) {
                    if (!seenNoteIds.has(result.noteId)) {
                        seenNoteIds.add(result.noteId);

                        // Get the note from Becca
                        const note = becca.notes[result.noteId];
                        if (!note) continue;

                        // Add to our results
                        allResults.push({
                            noteId: result.noteId,
                            title: note.title,
                            content: note.type === 'text' ? note.getContent() as string : null,
                            similarity: result.similarity,
                            branchId: note.getBranches()[0]?.branchId
                        });
                    }
                }
            }

            // Sort by similarity and take the top 'limit' results
            const sortedResults = allResults
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            // Cache the results
            this.recentQueriesCache.set(cacheKey, {
                timestamp: Date.now(),
                relevantNotes: sortedResults
            });

            return sortedResults;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`Error finding relevant notes: ${errorMessage}`);
            return [];
        }
    }

    /**
     * Find notes in a specific branch/context
     * @param embedding - Query embedding
     * @param contextNoteId - Note ID to restrict search to
     * @param limit - Max notes to return
     * @returns Array of relevant notes
     */
    private async findNotesInBranch(
        embedding: Float32Array,
        contextNoteId: string,
        limit = 5
    ): Promise<{noteId: string, similarity: number}[]> {
        try {
            // Get the subtree note IDs
            const subtreeNoteIds = await this.getSubtreeNoteIds(contextNoteId);

            if (subtreeNoteIds.length === 0) {
                return [];
            }

            // Get all embeddings for these notes using vectorStore instead of direct SQL
            const similarities: {noteId: string, similarity: number}[] = [];

            for (const noteId of subtreeNoteIds) {
                const noteEmbedding = await vectorStore.getEmbeddingForNote(
                    noteId,
                    this.provider.name, // Use name property instead of id
                    this.provider.getConfig().model // Use getConfig().model instead of modelId
                );

                if (noteEmbedding) {
                    const similarity = cosineSimilarity(embedding, noteEmbedding.embedding);
                    if (similarity > 0.5) {  // Apply similarity threshold
                        similarities.push({
                            noteId,
                            similarity
                        });
                    }
                }
            }

            // Sort by similarity and return top results
            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`Error finding notes in branch: ${errorMessage}`);
            return [];
        }
    }

    /**
     * Get all note IDs in a subtree (including the root note)
     * @param rootNoteId - Root note ID
     * @returns Array of note IDs
     */
    private async getSubtreeNoteIds(rootNoteId: string): Promise<string[]> {
        const note = becca.notes[rootNoteId];
        if (!note) {
            return [];
        }

        // Use becca to walk the note tree instead of direct SQL
        const noteIds = new Set<string>([rootNoteId]);

        // Helper function to collect all children
        const collectChildNotes = (noteId: string) => {
            // Use becca.getNote(noteId).getChildNotes() to get child notes
            const parentNote = becca.notes[noteId];
            if (!parentNote) return;

            // Get all branches where this note is the parent
            for (const branch of Object.values(becca.branches)) {
                if (branch.parentNoteId === noteId && !branch.isDeleted) {
                    const childNoteId = branch.noteId;
                    if (!noteIds.has(childNoteId)) {
                        noteIds.add(childNoteId);
                        // Recursively collect children of this child
                        collectChildNotes(childNoteId);
                    }
                }
            }
        };

        // Start collecting from the root
        collectChildNotes(rootNoteId);

        return Array.from(noteIds);
    }

    /**
     * Build a context string from relevant notes
     * @param sources - Array of notes
     * @param query - Original user query
     * @returns Formatted context string
     */
    buildContextFromNotes(sources: any[], query: string): string {
        if (!sources || sources.length === 0) {
            // Return a default context instead of empty string
            return "I am an AI assistant helping you with your Trilium notes. " +
                   "I couldn't find any specific notes related to your query, but I'll try to assist you " +
                   "with general knowledge about Trilium or other topics you're interested in.";
        }

        let context = `The following are relevant notes from your knowledge base that may help answer the query: "${query}"\n\n`;

        sources.forEach((source, index) => {
            context += `--- NOTE ${index + 1}: ${source.title} ---\n`;

            if (source.content) {
                // Truncate content if it's too long
                const maxContentLength = 1000;
                let content = source.content;

                if (content.length > maxContentLength) {
                    content = content.substring(0, maxContentLength) + " [content truncated due to length]";
                }

                context += `${content}\n`;
            } else {
                context += "[This note doesn't contain textual content]\n";
            }

            context += "\n";
        });

        context += "--- END OF NOTES ---\n\n";
        context += "Please use the information above to help answer the query. If the information doesn't contain what you need, just say so and use your general knowledge instead.";

        return context;
    }

    /**
     * Process a user query with the Trilium-specific approach:
     * 1. Generate search queries from the original question
     * 2. Find relevant notes using those queries
     * 3. Build a context string from the relevant notes
     *
     * @param userQuestion - The user's original question
     * @param llmService - The LLM service to use
     * @param contextNoteId - Optional note ID to restrict search to
     * @returns Object with context and notes
     */
    async processQuery(userQuestion: string, llmService: any, contextNoteId: string | null = null) {
        if (!this.initialized) {
            try {
                await this.initialize();
            } catch (error) {
                log.error(`Failed to initialize TriliumContextService: ${error}`);
                // Return a fallback response if initialization fails
                return {
                    context: "I am an AI assistant helping you with your Trilium notes. " +
                             "I'll try to assist you with general knowledge about your query.",
                    notes: [],
                    queries: [userQuestion]
                };
            }
        }

        try {
            // Step 1: Generate search queries
            let searchQueries: string[];
            try {
                searchQueries = await this.generateSearchQueries(userQuestion, llmService);
            } catch (error) {
                log.error(`Error generating search queries, using fallback: ${error}`);
                searchQueries = [userQuestion]; // Fallback to using the original question
            }
            log.info(`Generated search queries: ${JSON.stringify(searchQueries)}`);

            // Step 2: Find relevant notes using those queries
            let relevantNotes: any[] = [];
            try {
                relevantNotes = await this.findRelevantNotesMultiQuery(
                    searchQueries,
                    contextNoteId,
                    8 // Get more notes since we're using multiple queries
                );
            } catch (error) {
                log.error(`Error finding relevant notes: ${error}`);
                // Continue with empty notes list
            }

            // Step 3: Build context from the notes
            const context = this.buildContextFromNotes(relevantNotes, userQuestion);

            return {
                context,
                notes: relevantNotes,
                queries: searchQueries
            };
        } catch (error) {
            log.error(`Error in processQuery: ${error}`);
            // Return a fallback response if anything fails
            return {
                context: "I am an AI assistant helping you with your Trilium notes. " +
                         "I encountered an error while processing your query, but I'll try to assist you anyway.",
                notes: [],
                queries: [userQuestion]
            };
        }
    }
}

export default new TriliumContextService();
