/**
 * LLM Index Service
 *
 * Centralized service for managing knowledge base indexing for LLM features.
 * This service coordinates:
 * - Note embedding generation and management
 * - Smart context retrieval for LLM queries
 * - Progressive indexing of the knowledge base
 * - Optimization of the semantic search capabilities
 */

import log from "../log.js";
import options from "../options.js";
import becca from "../../becca/becca.js";
import vectorStore from "./embeddings/index.js";
import providerManager from "./providers/providers.js";
import { ContextExtractor } from "./context/index.js";
import eventService from "../events.js";
import type { NoteEmbeddingContext } from "./embeddings/embeddings_interface.js";
import type { OptionDefinitions } from "../options_interface.js";
import sql from "../sql.js";
import sqlInit from "../sql_init.js";
import { CONTEXT_PROMPTS } from './constants/llm_prompt_constants.js';

class IndexService {
    private initialized = false;
    private indexingInProgress = false;
    private contextExtractor = new ContextExtractor();
    private automaticIndexingInterval?: NodeJS.Timeout;

    // Index rebuilding tracking
    private indexRebuildInProgress = false;
    private indexRebuildProgress = 0;
    private indexRebuildTotal = 0;
    private indexRebuildCurrent = 0;

    // Configuration
    private defaultQueryDepth = 2;
    private maxNotesPerQuery = 10;
    private defaultSimilarityThreshold = 0.65;
    private indexUpdateInterval = 3600000; // 1 hour in milliseconds

    /**
     * Initialize the index service
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Check if database is initialized before proceeding
            if (!sqlInit.isDbInitialized()) {
                log.info("Index service: Database not initialized yet, skipping initialization");
                return;
            }

            const aiEnabled = await options.getOptionBool('aiEnabled');
            if (!aiEnabled) {
                log.info("Index service: AI features disabled, skipping initialization");
                return;
            }

            // Check if embedding system is ready
            const providers = await providerManager.getEnabledEmbeddingProviders();
            if (!providers || providers.length === 0) {
                throw new Error("No embedding providers available");
            }

            // Check if this instance should process embeddings
            const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';
            const isSyncServer = await this.isSyncServerForEmbeddings();
            const shouldProcessEmbeddings = embeddingLocation === 'client' || isSyncServer;

            // Setup automatic indexing if enabled and this instance should process embeddings
            if (await options.getOptionBool('embeddingAutoUpdateEnabled') && shouldProcessEmbeddings) {
                this.setupAutomaticIndexing();
                log.info(`Index service: Automatic indexing enabled, processing embeddings ${isSyncServer ? 'as sync server' : 'as client'}`);
            } else if (await options.getOptionBool('embeddingAutoUpdateEnabled')) {
                log.info("Index service: Automatic indexing enabled, but this instance is not configured to process embeddings");
            }

            // Listen for note changes to update index
            this.setupEventListeners();

            this.initialized = true;
            log.info("Index service initialized successfully");
        } catch (error: any) {
            log.error(`Error initializing index service: ${error.message || "Unknown error"}`);
            throw error;
        }
    }

    /**
     * Setup event listeners for index updates
     */
    private setupEventListeners() {
        // Listen for note content changes
        eventService.subscribe(eventService.NOTE_CONTENT_CHANGE, async ({ entity }) => {
            if (entity && entity.noteId) {
                // Always queue notes for indexing, but the actual processing will depend on configuration
                await this.queueNoteForIndexing(entity.noteId);
            }
        });

        // Listen for new notes
        eventService.subscribe(eventService.ENTITY_CREATED, async ({ entityName, entity }) => {
            if (entityName === "notes" && entity && entity.noteId) {
                await this.queueNoteForIndexing(entity.noteId);
            }
        });

        // Listen for note title changes
        eventService.subscribe(eventService.NOTE_TITLE_CHANGED, async ({ noteId }) => {
            if (noteId) {
                await this.queueNoteForIndexing(noteId);
            }
        });

        // Listen for changes in AI settings
        eventService.subscribe(eventService.ENTITY_CHANGED, async ({ entityName, entity }) => {
            if (entityName === "options" && entity && entity.name) {
                if (entity.name.startsWith('ai') || entity.name.startsWith('embedding')) {
                    log.info("AI settings changed, updating index service configuration");
                    await this.updateConfiguration();
                }
            }
        });
    }

    /**
     * Set up automatic indexing of notes
     */
    private setupAutomaticIndexing() {
        // Clear existing interval if any
        if (this.automaticIndexingInterval) {
            clearInterval(this.automaticIndexingInterval);
        }

        // Create new interval
        this.automaticIndexingInterval = setInterval(async () => {
            try {
                if (!this.indexingInProgress) {
                    // Check if this instance should process embeddings
                    const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';
                    const isSyncServer = await this.isSyncServerForEmbeddings();
                    const shouldProcessEmbeddings = embeddingLocation === 'client' || isSyncServer;

                    if (!shouldProcessEmbeddings) {
                        // This instance is not configured to process embeddings
                        return;
                    }

                    const stats = await vectorStore.getEmbeddingStats();

                    // Only run automatic indexing if we're below 95% completion
                    if (stats.percentComplete < 95) {
                        log.info(`Starting automatic indexing (current completion: ${stats.percentComplete}%)`);
                        await this.runBatchIndexing(50); // Process 50 notes at a time
                    }
                }
            } catch (error: any) {
                log.error(`Error in automatic indexing: ${error.message || "Unknown error"}`);
            }
        }, this.indexUpdateInterval);

        log.info("Automatic indexing scheduled");
    }

    /**
     * Update service configuration from options
     */
    private async updateConfiguration() {
        try {
            // Update indexing interval
            const intervalMs = parseInt(await options.getOption('embeddingUpdateInterval') || '3600000', 10);
            this.indexUpdateInterval = intervalMs;

            // Check if this instance should process embeddings
            const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';
            const isSyncServer = await this.isSyncServerForEmbeddings();
            const shouldProcessEmbeddings = embeddingLocation === 'client' || isSyncServer;

            // Update automatic indexing setting
            const autoIndexing = await options.getOptionBool('embeddingAutoUpdateEnabled');
            if (autoIndexing && shouldProcessEmbeddings && !this.automaticIndexingInterval) {
                this.setupAutomaticIndexing();
                log.info(`Index service: Automatic indexing enabled, processing embeddings ${isSyncServer ? 'as sync server' : 'as client'}`);
            } else if (autoIndexing && !shouldProcessEmbeddings && this.automaticIndexingInterval) {
                clearInterval(this.automaticIndexingInterval);
                this.automaticIndexingInterval = undefined;
                log.info("Index service: Automatic indexing disabled for this instance based on configuration");
            } else if (!autoIndexing && this.automaticIndexingInterval) {
                clearInterval(this.automaticIndexingInterval);
                this.automaticIndexingInterval = undefined;
            }

            // Update similarity threshold
            const similarityThreshold = await options.getOption('embeddingSimilarityThreshold');
            this.defaultSimilarityThreshold = parseFloat(similarityThreshold || '0.65');

            // Update max notes per query
            const maxNotesPerQuery = await options.getOption('maxNotesPerLlmQuery');
            this.maxNotesPerQuery = parseInt(maxNotesPerQuery || '10', 10);

            log.info("Index service configuration updated");
        } catch (error: any) {
            log.error(`Error updating index service configuration: ${error.message || "Unknown error"}`);
        }
    }

    /**
     * Queue a note for indexing
     */
    async queueNoteForIndexing(noteId: string, priority = false) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Always queue notes for indexing, regardless of where embedding generation happens
            // The actual processing will be determined when the queue is processed
            await vectorStore.queueNoteForEmbedding(noteId, 'UPDATE');
            return true;
        } catch (error: any) {
            log.error(`Error queueing note ${noteId} for indexing: ${error.message || "Unknown error"}`);
            return false;
        }
    }

    /**
     * Start full knowledge base indexing
     * @param force - Whether to force reindexing of all notes
     */
    async startFullIndexing(force = false) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.indexingInProgress) {
            throw new Error("Indexing already in progress");
        }

        try {
            // Check if this instance should process embeddings
            const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';
            const isSyncServer = await this.isSyncServerForEmbeddings();
            const shouldProcessEmbeddings = embeddingLocation === 'client' || isSyncServer;

            if (!shouldProcessEmbeddings) {
                // This instance is not configured to process embeddings
                log.info("Skipping full indexing as this instance is not configured to process embeddings");
                return false;
            }

            this.indexingInProgress = true;
            this.indexRebuildInProgress = true;
            this.indexRebuildProgress = 0;
            this.indexRebuildCurrent = 0;

            // Reset index rebuild progress
            const totalEmbeddings = await sql.getValue("SELECT COUNT(*) FROM note_embeddings") as number;

            if (totalEmbeddings === 0) {
                // If there are no embeddings yet, we need to create them first
                const totalNotes = await sql.getValue("SELECT COUNT(*) FROM notes WHERE isDeleted = 0") as number;
                this.indexRebuildTotal = totalNotes;

                log.info("No embeddings found, starting full embedding generation first");
                await vectorStore.reprocessAllNotes();
                log.info("Full embedding generation initiated");
            } else {
                // For index rebuild, use the number of embeddings as the total
                this.indexRebuildTotal = totalEmbeddings;

                if (force) {
                    // Use the new rebuildSearchIndex function that doesn't regenerate embeddings
                    log.info("Starting forced index rebuild without regenerating embeddings");
                    setTimeout(async () => {
                        try {
                            await vectorStore.rebuildSearchIndex();
                            this.indexRebuildInProgress = false;
                            this.indexRebuildProgress = 100;
                            log.info("Index rebuild completed successfully");
                        } catch (error: any) {
                            log.error(`Error during index rebuild: ${error.message || "Unknown error"}`);
                            this.indexRebuildInProgress = false;
                        }
                    }, 0);
                } else {
                    // Check current stats
                    const stats = await vectorStore.getEmbeddingStats();

                    // Only start indexing if we're below 90% completion or if embeddings exist but need optimization
                    if (stats.percentComplete < 90) {
                        log.info("Embedding coverage below 90%, starting full embedding generation");
                        await vectorStore.reprocessAllNotes();
                        log.info("Full embedding generation initiated");
                    } else {
                        log.info(`Embedding coverage at ${stats.percentComplete}%, starting index optimization`);
                        setTimeout(async () => {
                            try {
                                await vectorStore.rebuildSearchIndex();
                                this.indexRebuildInProgress = false;
                                this.indexRebuildProgress = 100;
                                log.info("Index optimization completed successfully");
                            } catch (error: any) {
                                log.error(`Error during index optimization: ${error.message || "Unknown error"}`);
                                this.indexRebuildInProgress = false;
                            }
                        }, 0);
                    }
                }
            }

            return true;
        } catch (error: any) {
            log.error(`Error starting full indexing: ${error.message || "Unknown error"}`);
            this.indexRebuildInProgress = false;
            return false;
        } finally {
            this.indexingInProgress = false;
        }
    }

    /**
     * Update index rebuild progress
     * @param processed - Number of notes processed
     */
    updateIndexRebuildProgress(processed: number) {
        if (!this.indexRebuildInProgress) return;

        this.indexRebuildCurrent += processed;

        if (this.indexRebuildTotal > 0) {
            this.indexRebuildProgress = Math.min(
                Math.round((this.indexRebuildCurrent / this.indexRebuildTotal) * 100),
                100
            );
        }

        if (this.indexRebuildCurrent >= this.indexRebuildTotal) {
            this.indexRebuildInProgress = false;
            this.indexRebuildProgress = 100;
        }
    }

    /**
     * Get the current index rebuild progress
     */
    getIndexRebuildStatus() {
        return {
            inProgress: this.indexRebuildInProgress,
            progress: this.indexRebuildProgress,
            total: this.indexRebuildTotal,
            current: this.indexRebuildCurrent
        };
    }

    /**
     * Run a batch indexing job for a limited number of notes
     * @param batchSize - Maximum number of notes to process
     */
    async runBatchIndexing(batchSize = 20) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.indexingInProgress) {
            return false;
        }

        try {
            this.indexingInProgress = true;

            // Check if this instance should process embeddings
            const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';
            const isSyncServer = await this.isSyncServerForEmbeddings();
            const shouldProcessEmbeddings = embeddingLocation === 'client' || isSyncServer;

            if (!shouldProcessEmbeddings) {
                // This instance is not configured to process embeddings
                log.info("Skipping batch indexing as this instance is not configured to process embeddings");
                return false;
            }

            // Process the embedding queue
            await vectorStore.processEmbeddingQueue();

            return true;
        } catch (error: any) {
            log.error(`Error in batch indexing: ${error.message || "Unknown error"}`);
            return false;
        } finally {
            this.indexingInProgress = false;
        }
    }

    /**
     * Get the current indexing statistics
     */
    async getIndexingStats() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const stats = await vectorStore.getEmbeddingStats();

            return {
                ...stats,
                isIndexing: this.indexingInProgress,
                automaticIndexingEnabled: !!this.automaticIndexingInterval
            };
        } catch (error: any) {
            log.error(`Error getting indexing stats: ${error.message || "Unknown error"}`);
            return {
                totalNotesCount: 0,
                embeddedNotesCount: 0,
                queuedNotesCount: 0,
                failedNotesCount: 0,
                percentComplete: 0,
                isIndexing: this.indexingInProgress,
                automaticIndexingEnabled: !!this.automaticIndexingInterval,
                error: error.message || "Unknown error"
            };
        }
    }

    /**
     * Get information about failed embedding attempts
     */
    async getFailedIndexes(limit = 100) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            return await vectorStore.getFailedEmbeddingNotes(limit);
        } catch (error: any) {
            log.error(`Error getting failed indexes: ${error.message || "Unknown error"}`);
            return [];
        }
    }

    /**
     * Retry indexing a specific note that previously failed
     */
    async retryFailedNote(noteId: string) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            return await vectorStore.retryFailedEmbedding(noteId);
        } catch (error: any) {
            log.error(`Error retrying failed note ${noteId}: ${error.message || "Unknown error"}`);
            return false;
        }
    }

    /**
     * Retry all failed indexing operations
     */
    async retryAllFailedNotes() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const count = await vectorStore.retryAllFailedEmbeddings();
            log.info(`Queued ${count} failed notes for retry`);
            return count;
        } catch (error: any) {
            log.error(`Error retrying all failed notes: ${error.message || "Unknown error"}`);
            return 0;
        }
    }

    /**
     * Find semantically similar notes to a given query
     * @param query - Text query to find similar notes for
     * @param contextNoteId - Optional note ID to restrict search to a branch
     * @param limit - Maximum number of results to return
     */
    async findSimilarNotes(
        query: string,
        contextNoteId?: string,
        limit = 10
    ) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Get all enabled embedding providers
            const providers = await providerManager.getEnabledEmbeddingProviders();
            if (!providers || providers.length === 0) {
                throw new Error("No embedding providers available");
            }

            // Get the embedding provider precedence
            const options = (await import('../options.js')).default;
            let preferredProviders: string[] = [];

            const embeddingPrecedence = await options.getOption('embeddingProviderPrecedence');
            let provider;

            if (embeddingPrecedence) {
                // Parse the precedence string
                if (embeddingPrecedence.startsWith('[') && embeddingPrecedence.endsWith(']')) {
                    preferredProviders = JSON.parse(embeddingPrecedence);
                } else if (typeof embeddingPrecedence === 'string') {
                    if (embeddingPrecedence.includes(',')) {
                        preferredProviders = embeddingPrecedence.split(',').map(p => p.trim());
                    } else {
                        preferredProviders = [embeddingPrecedence];
                    }
                }

                // Find first enabled provider by precedence order
                for (const providerName of preferredProviders) {
                    const matchedProvider = providers.find(p => p.name === providerName);
                    if (matchedProvider) {
                        provider = matchedProvider;
                        break;
                    }
                }

                // If no match found, use first available
                if (!provider && providers.length > 0) {
                    provider = providers[0];
                }
            } else {
                // Default to first available provider
                provider = providers[0];
            }

            if (!provider) {
                throw new Error("No suitable embedding provider found");
            }

            log.info(`Searching with embedding provider: ${provider.name}, model: ${provider.getConfig().model}`);

            // Generate embedding for the query
            const embedding = await provider.generateEmbeddings(query);
            log.info(`Generated embedding for query: "${query}" (${embedding.length} dimensions)`);

            // Add the original query as a property to the embedding
            // This is used for title matching in the vector search
            Object.defineProperty(embedding, 'originalQuery', {
                value: query,
                writable: false,
                enumerable: true,
                configurable: false
            });

            // Store query text in a global cache for possible regeneration with different providers
            // Use a type declaration to avoid TypeScript errors
            interface CustomGlobal {
                recentEmbeddingQueries?: Record<string, string>;
            }
            const globalWithCache = global as unknown as CustomGlobal;

            if (!globalWithCache.recentEmbeddingQueries) {
                globalWithCache.recentEmbeddingQueries = {};
            }

            // Use a substring of the embedding as a key (full embedding is too large)
            const embeddingKey = embedding.toString().substring(0, 100);
            globalWithCache.recentEmbeddingQueries[embeddingKey] = query;

            // Limit cache size to prevent memory leaks (keep max 50 recent queries)
            const keys = Object.keys(globalWithCache.recentEmbeddingQueries);
            if (keys.length > 50) {
                delete globalWithCache.recentEmbeddingQueries[keys[0]];
            }

            // Get Note IDs to search, optionally filtered by branch
            let similarNotes: { noteId: string; title: string; similarity: number; contentType?: string }[] = [];

            // Check if we need to restrict search to a specific branch
            if (contextNoteId) {
                const note = becca.getNote(contextNoteId);
                if (!note) {
                    throw new Error(`Context note ${contextNoteId} not found`);
                }

                // Get all note IDs in the branch
                const branchNoteIds = new Set<string>();
                const collectNoteIds = (noteId: string) => {
                    branchNoteIds.add(noteId);
                    const note = becca.getNote(noteId);
                    if (note) {
                        for (const childNote of note.getChildNotes()) {
                            if (!branchNoteIds.has(childNote.noteId)) {
                                collectNoteIds(childNote.noteId);
                            }
                        }
                    }
                };

                collectNoteIds(contextNoteId);

                // Get embeddings for all notes in the branch
                const config = provider.getConfig();

                // Import the ContentType detection from vector utils
                const { ContentType, detectContentType, cosineSimilarity } = await import('./embeddings/vector_utils.js');

                for (const noteId of branchNoteIds) {
                    const noteEmbedding = await vectorStore.getEmbeddingForNote(
                        noteId,
                        provider.name,
                        config.model
                    );

                    if (noteEmbedding) {
                        // Get the note to determine its content type
                        const note = becca.getNote(noteId);
                        if (note) {
                            // Detect content type from mime type
                            const contentType = detectContentType(note.mime, '');

                            // Use content-aware similarity calculation
                            const similarity = cosineSimilarity(
                                embedding,
                                noteEmbedding.embedding,
                                true, // normalize
                                config.model, // source model
                                noteEmbedding.providerId, // target model (use providerId)
                                contentType, // content type for padding strategy
                                undefined // use default BALANCED performance profile
                            );

                            if (similarity >= this.defaultSimilarityThreshold) {
                                similarNotes.push({
                                    noteId,
                                    title: note.title,
                                    similarity,
                                    contentType: contentType.toString()
                                });
                            }
                        }
                    }
                }

                // Sort by similarity and return top results
                return similarNotes
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, limit);
            } else {
                // Search across all notes
                const config = provider.getConfig();
                const results = await vectorStore.findSimilarNotes(
                    embedding,
                    provider.name,
                    config.model,
                    limit,
                    this.defaultSimilarityThreshold
                );

                // Enhance results with note titles
                similarNotes = results.map(result => {
                    const note = becca.getNote(result.noteId);
                    return {
                        noteId: result.noteId,
                        title: note ? note.title : 'Unknown Note',
                        similarity: result.similarity,
                        contentType: result.contentType
                    };
                });

                return similarNotes;
            }
        } catch (error: any) {
            log.error(`Error finding similar notes: ${error.message || "Unknown error"}`);
            return [];
        }
    }

    /**
     * Generate context for an LLM query based on relevance to the user's question
     * @param query - The user's question
     * @param contextNoteId - Optional ID of a note to use as context root
     * @param depth - Depth of context to include (1-4)
     */
    async generateQueryContext(
        query: string,
        contextNoteId?: string,
        depth = 2
    ) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Find similar notes to the query
            const similarNotes = await this.findSimilarNotes(
                query,
                contextNoteId,
                this.maxNotesPerQuery
            );

            if (similarNotes.length === 0) {
                return CONTEXT_PROMPTS.INDEX_NO_NOTES_CONTEXT;
            }

            // Build context from the similar notes
            let context = `I found some relevant information in your notes that may help answer: "${query}"\n\n`;

            for (const note of similarNotes) {
                const noteObj = becca.getNote(note.noteId);
                if (!noteObj) continue;

                context += `## ${noteObj.title}\n`;

                // Add parent context for better understanding
                const parents = noteObj.getParentNotes();
                if (parents.length > 0) {
                    context += `Path: ${parents.map(p => p.title).join(' > ')}\n`;
                }

                // Add content based on depth
                if (depth >= 2) {
                    const content = await this.contextExtractor.getNoteContent(note.noteId);
                    if (content) {
                        // For larger content, use summary
                        if (content.length > 2000) {
                            const summary = await this.contextExtractor.summarizeContent(content, noteObj.title);
                            context += `${summary}\n[Content summarized due to length]\n\n`;
                        } else {
                            context += `${content}\n\n`;
                        }
                    }
                }

                // Add child note titles for more context if depth >= 3
                if (depth >= 3) {
                    const childNotes = noteObj.getChildNotes();
                    if (childNotes.length > 0) {
                        context += `Child notes: ${childNotes.slice(0, 5).map(n => n.title).join(', ')}`;
                        if (childNotes.length > 5) {
                            context += ` and ${childNotes.length - 5} more`;
                        }
                        context += `\n\n`;
                    }
                }

                // Add attribute context for even deeper understanding if depth >= 4
                if (depth >= 4) {
                    const attributes = noteObj.getOwnedAttributes();
                    if (attributes.length > 0) {
                        const relevantAttrs = attributes.filter(a =>
                            !a.name.startsWith('_') && !a.name.startsWith('child:') && !a.name.startsWith('relation:')
                        );

                        if (relevantAttrs.length > 0) {
                            context += `Attributes: ${relevantAttrs.map(a =>
                                `${a.type === 'label' ? '#' : '~'}${a.name}${a.value ? '=' + a.value : ''}`
                            ).join(', ')}\n\n`;
                        }
                    }
                }
            }

            // Add instructions about how to reference the notes
            context += "When referring to information from these notes in your response, please cite them by their titles " +
                      "(e.g., \"According to your note on [Title]...\"). If the information doesn't contain what you need, " +
                      "just say so and use your general knowledge instead.";

            return context;
        } catch (error: any) {
            log.error(`Error generating query context: ${error.message || "Unknown error"}`);
            return "I'm an AI assistant helping with your Trilium notes. I encountered an error while retrieving context from your notes, but I'll try to assist based on general knowledge.";
        }
    }

    /**
     * Check if this instance is a sync server and should generate embeddings
     */
    async isSyncServerForEmbeddings() {
        // Check if this is a sync server (no syncServerHost means this is a sync server)
        const syncServerHost = await options.getOption('syncServerHost');
        const isSyncServer = !syncServerHost;

        // Check if embedding generation should happen on the sync server
        const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';
        const shouldGenerateOnSyncServer = embeddingLocation === 'sync_server';

        return isSyncServer && shouldGenerateOnSyncServer;
    }

    /**
     * Generate a comprehensive index entry for a note
     * This prepares all metadata and contexts for optimal LLM retrieval
     */
    async generateNoteIndex(noteId: string) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const note = becca.getNote(noteId);
            if (!note) {
                throw new Error(`Note ${noteId} not found`);
            }

            // Check where embedding generation should happen
            const embeddingLocation = await options.getOption('embeddingGenerationLocation') || 'client';

            // If embedding generation should happen on the sync server and we're not the sync server,
            // just queue the note for embedding but don't generate it
            const isSyncServer = await this.isSyncServerForEmbeddings();
            const shouldSkipGeneration = embeddingLocation === 'sync_server' && !isSyncServer;

            if (shouldSkipGeneration) {
                // We're not the sync server, so just queue the note for embedding
                // The sync server will handle the actual embedding generation
                log.info(`Note ${noteId} queued for embedding generation on sync server`);
                return true;
            }

            // Get complete note context for indexing
            const context = await vectorStore.getNoteEmbeddingContext(noteId);

            // Queue note for embedding with all available providers
            const providers = await providerManager.getEnabledEmbeddingProviders();
            for (const provider of providers) {
                try {
                    const embedding = await provider.generateNoteEmbeddings(context);
                    if (embedding) {
                        const config = provider.getConfig();
                        await vectorStore.storeNoteEmbedding(
                            noteId,
                            provider.name,
                            config.model,
                            embedding
                        );
                    }
                } catch (error: any) {
                    log.error(`Error generating embedding with provider ${provider.name} for note ${noteId}: ${error.message || "Unknown error"}`);
                }
            }

            return true;
        } catch (error: any) {
            log.error(`Error generating note index for ${noteId}: ${error.message || "Unknown error"}`);
            return false;
        }
    }
}

// Create singleton instance
const indexService = new IndexService();
export default indexService;
