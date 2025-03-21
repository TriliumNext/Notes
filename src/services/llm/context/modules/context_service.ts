import log from '../../../log.js';
import providerManager from './provider_manager.js';
import cacheManager from './cache_manager.js';
import semanticSearch from './semantic_search.js';
import queryEnhancer from './query_enhancer.js';
import contextFormatter from './context_formatter.js';
import aiServiceManager from '../../ai_service_manager.js';
import { ContextExtractor } from '../index.js';
import { CONTEXT_PROMPTS } from '../../prompts/llm_prompt_constants.js';
import becca from '../../../../becca/becca.js';

/**
 * Main context service that integrates all context-related functionality
 * This service replaces the old TriliumContextService and SemanticContextService
 */
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
     * @param contextNoteId - Optional note ID to restrict search to a branch
     * @param showThinking - Whether to show the thinking process in output
     * @returns Context information and relevant notes
     */
    async processQuery(
        userQuestion: string,
        llmService: any,
        contextNoteId: string | null = null,
        showThinking: boolean = false
    ) {
        log.info(`Processing query with: question="${userQuestion.substring(0, 50)}...", noteId=${contextNoteId}, showThinking=${showThinking}`);

        if (!this.initialized) {
            try {
                await this.initialize();
            } catch (error) {
                log.error(`Failed to initialize ContextService: ${error}`);
                // Return a fallback response if initialization fails
                return {
                    context: CONTEXT_PROMPTS.NO_NOTES_CONTEXT,
                    notes: [],
                    queries: [userQuestion]
                };
            }
        }

        try {
            // Step 1: Generate search queries
            let searchQueries: string[];
            try {
                searchQueries = await queryEnhancer.generateSearchQueries(userQuestion, llmService);
            } catch (error) {
                log.error(`Error generating search queries, using fallback: ${error}`);
                searchQueries = [userQuestion]; // Fallback to using the original question
            }
            log.info(`Generated search queries: ${JSON.stringify(searchQueries)}`);

            // Step 2: Find relevant notes using multi-query approach
            let relevantNotes: any[] = [];
            try {
                // Find notes for each query and combine results
                const allResults: Map<string, any> = new Map();

                for (const query of searchQueries) {
                    const results = await semanticSearch.findRelevantNotes(
                        query,
                        contextNoteId,
                        5 // Limit per query
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
                relevantNotes = Array.from(allResults.values())
                    .filter(note => {
                        // Filter out notes with no content or very minimal content (less than 10 chars)
                        const hasContent = note.content && note.content.trim().length > 10;
                        if (!hasContent) {
                            log.info(`Filtering out empty/minimal note: "${note.title}" (${note.noteId})`);
                        }
                        return hasContent;
                    })
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, 20); // Increased from 8 to 20 notes

                log.info(`After filtering out empty notes, ${relevantNotes.length} relevant notes remain`);
            } catch (error) {
                log.error(`Error finding relevant notes: ${error}`);
                // Continue with empty notes list
            }

            // Step 3: Build context from the notes
            const provider = await providerManager.getPreferredEmbeddingProvider();
            const providerId = provider?.name || 'default';
            const context = await contextFormatter.buildContextFromNotes(relevantNotes, userQuestion, providerId);

            // DEBUG: Log the initial context built from notes
            log.info(`Initial context from buildContextFromNotes: ${context.length} chars, starting with: "${context.substring(0, 150)}..."`);

            // Step 4: Add agent tools context with thinking process if requested
            let enhancedContext = context;
            try {
                // Pass 'root' as the default noteId when no specific note is selected
                const noteIdToUse = contextNoteId || 'root';
                log.info(`Calling getAgentToolsContext with noteId=${noteIdToUse}, showThinking=${showThinking}`);

                const agentContext = await this.getAgentToolsContext(
                    noteIdToUse,
                    userQuestion,
                    showThinking,
                    relevantNotes
                );

                if (agentContext) {
                    enhancedContext = enhancedContext + "\n\n" + agentContext;
                }

                // DEBUG: Log the final combined context
                log.info(`FINAL COMBINED CONTEXT: ${enhancedContext.length} chars, with content structure: ${this.summarizeContextStructure(enhancedContext)}`);
            } catch (error) {
                log.error(`Error getting agent tools context: ${error}`);
                // Continue with the basic context
            }

            return {
                context: enhancedContext,
                notes: relevantNotes,
                queries: searchQueries
            };
        } catch (error) {
            log.error(`Error processing query: ${error}`);
            return {
                context: CONTEXT_PROMPTS.NO_NOTES_CONTEXT,
                notes: [],
                queries: [userQuestion]
            };
        }
    }

    /**
     * Get context with agent tools enhancement
     *
     * @param noteId - The relevant note ID
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
        try {
            log.info(`Building enhanced agent tools context for query: "${query.substring(0, 50)}...", noteId=${noteId}, showThinking=${showThinking}`);

            // Make sure agent tools are initialized
            const agentManager = aiServiceManager.getInstance();

            // Initialize all tools if not already done
            if (!agentManager.getAgentTools().isInitialized()) {
                await agentManager.initializeAgentTools();
                log.info("Agent tools initialized on-demand in getAgentToolsContext");
            }

            // Get all agent tools
            const vectorSearchTool = agentManager.getVectorSearchTool();
            const noteNavigatorTool = agentManager.getNoteNavigatorTool();
            const queryDecompositionTool = agentManager.getQueryDecompositionTool();
            const contextualThinkingTool = agentManager.getContextualThinkingTool();

            // Step 1: Start a thinking process
            const thinkingId = contextualThinkingTool.startThinking(query);
            contextualThinkingTool.addThinkingStep(thinkingId, {
                type: 'observation',
                content: `Analyzing query: "${query}" for note ID: ${noteId}`
            });

            // Step 2: Decompose the query into sub-questions
            const decomposedQuery = queryDecompositionTool.decomposeQuery(query);
            contextualThinkingTool.addThinkingStep(thinkingId, {
                type: 'observation',
                content: `Query complexity: ${decomposedQuery.complexity}/10. Decomposed into ${decomposedQuery.subQueries.length} sub-queries.`
            });

            // Log each sub-query as a thinking step
            for (const subQuery of decomposedQuery.subQueries) {
                contextualThinkingTool.addThinkingStep(thinkingId, {
                    type: 'question',
                    content: subQuery.text,
                    metadata: {
                        reason: subQuery.reason
                    }
                });
            }

            // Step 3: Use vector search to find related content
            // Use an aggressive search with lower threshold to get more results
            const searchOptions = {
                threshold: 0.5,  // Lower threshold to include more matches
                limit: 15        // Get more results
            };

            const vectorSearchPromises = [];

            // Search for each sub-query that isn't just the original query
            for (const subQuery of decomposedQuery.subQueries.filter(sq => sq.text !== query)) {
                vectorSearchPromises.push(
                    vectorSearchTool.search(subQuery.text, noteId, searchOptions)
                        .then(results => {
                            return {
                                query: subQuery.text,
                                results
                            };
                        })
                );
            }

            // Wait for all searches to complete
            const searchResults = await Promise.all(vectorSearchPromises);

            // Record the search results in thinking steps
            let totalResults = 0;
            for (const result of searchResults) {
                totalResults += result.results.length;

                if (result.results.length > 0) {
                    const stepId = contextualThinkingTool.addThinkingStep(thinkingId, {
                        type: 'evidence',
                        content: `Found ${result.results.length} relevant notes for sub-query: "${result.query}"`,
                        metadata: {
                            searchQuery: result.query
                        }
                    });

                    // Add top results as children
                    for (const note of result.results.slice(0, 3)) {
                        contextualThinkingTool.addThinkingStep(thinkingId, {
                            type: 'evidence',
                            content: `Note "${note.title}" (similarity: ${Math.round(note.similarity * 100)}%) contains relevant information`,
                            metadata: {
                                noteId: note.noteId,
                                similarity: note.similarity
                            }
                        }, stepId);
                    }
                } else {
                    contextualThinkingTool.addThinkingStep(thinkingId, {
                        type: 'observation',
                        content: `No notes found for sub-query: "${result.query}"`,
                        metadata: {
                            searchQuery: result.query
                        }
                    });
                }
            }

            // Step 4: Get note structure information
            try {
                const noteStructure = await noteNavigatorTool.getNoteStructure(noteId);

                contextualThinkingTool.addThinkingStep(thinkingId, {
                    type: 'observation',
                    content: `Note structure: ${noteStructure.childCount} child notes, ${noteStructure.attributes.length} attributes, ${noteStructure.parentPath.length} levels in hierarchy`,
                    metadata: {
                        structure: noteStructure
                    }
                });

                // Add information about parent path
                if (noteStructure.parentPath.length > 0) {
                    const parentPathStr = noteStructure.parentPath.map((p: {title: string, noteId: string}) => p.title).join(' > ');
                    contextualThinkingTool.addThinkingStep(thinkingId, {
                        type: 'observation',
                        content: `Note hierarchy: ${parentPathStr}`,
                        metadata: {
                            parentPath: noteStructure.parentPath
                        }
                    });
                }
            } catch (error) {
                log.error(`Error getting note structure: ${error}`);
                contextualThinkingTool.addThinkingStep(thinkingId, {
                    type: 'observation',
                    content: `Unable to retrieve note structure information: ${error}`
                });
            }

            // Step 5: Conclude thinking process
            contextualThinkingTool.addThinkingStep(thinkingId, {
                type: 'conclusion',
                content: `Analysis complete. Found ${totalResults} relevant notes across ${searchResults.length} search queries.`,
                metadata: {
                    totalResults,
                    queryCount: searchResults.length
                }
            });

            // Complete the thinking process
            contextualThinkingTool.completeThinking(thinkingId);

            // Step 6: Build the context string combining all the information
            let agentContext = '';

            // Add note structure information
            try {
                const noteStructure = await noteNavigatorTool.getNoteStructure(noteId);
                agentContext += `## Current Note Context\n`;
                agentContext += `- Note Title: ${noteStructure.title}\n`;

                if (noteStructure.parentPath.length > 0) {
                    const parentPathStr = noteStructure.parentPath.map((p: {title: string, noteId: string}) => p.title).join(' > ');
                    agentContext += `- Location: ${parentPathStr}\n`;
                }

                if (noteStructure.attributes.length > 0) {
                    agentContext += `- Attributes: ${noteStructure.attributes.map((a: {name: string, value: string}) => `${a.name}=${a.value}`).join(', ')}\n`;
                }

                if (noteStructure.childCount > 0) {
                    agentContext += `- Contains ${noteStructure.childCount} child notes\n`;
                }

                agentContext += `\n`;
            } catch (error) {
                log.error(`Error adding note structure to context: ${error}`);
            }

            // Combine the notes from both searches - the initial relevantNotes and from vector search
            // Start with a Map to deduplicate by noteId
            const allNotes = new Map<string, any>();

            // Add notes from the initial search in processQuery (relevantNotes parameter)
            if (relevantNotes && relevantNotes.length > 0) {
                log.info(`Adding ${relevantNotes.length} notes from initial search to combined results`);
                for (const note of relevantNotes) {
                    if (note.noteId) {
                        allNotes.set(note.noteId, note);
                    }
                }
            }

            // Add notes from vector search of sub-queries
            const vectorSearchNotes = searchResults.flatMap(r => r.results);
            if (vectorSearchNotes.length > 0) {
                log.info(`Adding ${vectorSearchNotes.length} notes from vector search to combined results`);
                for (const note of vectorSearchNotes) {
                    // If note already exists, keep the one with higher similarity
                    if (!allNotes.has(note.noteId) || note.similarity > allNotes.get(note.noteId).similarity) {
                        allNotes.set(note.noteId, note);
                    }
                }
            }

            // Convert the combined Map to an array and sort by similarity
            const combinedNotes = Array.from(allNotes.values())
                .filter(note => {
                    // Filter out notes with no content or very minimal content
                    const hasContent = note.content && note.content.trim().length > 10;
                    if (!hasContent) {
                        log.info(`Filtering out empty/minimal note from combined results: "${note.title}" (${note.noteId})`);
                    }
                    return hasContent;
                })
                .sort((a, b) => b.similarity - a.similarity);

            log.info(`Combined ${relevantNotes.length} notes from initial search with ${vectorSearchNotes.length} notes from vector search, resulting in ${combinedNotes.length} unique notes after filtering out empty notes`);

            // Filter for Qu-related notes
            const quNotes = combinedNotes.filter(result =>
                result.title.toLowerCase().includes('qu') ||
                (result.content && result.content.toLowerCase().includes('qu'))
            );

            if (quNotes.length > 0) {
                log.info(`Found ${quNotes.length} Qu-related notes out of ${combinedNotes.length} total notes`);
                quNotes.forEach((note, idx) => {
                    if (idx < 3) { // Log just a sample to avoid log spam
                        log.info(`Qu note ${idx+1}: "${note.title}" (similarity: ${Math.round(note.similarity * 100)}%), content length: ${note.content ? note.content.length : 0} chars`);
                    }
                });

                // Prioritize Qu notes first, then other notes by similarity
                const nonQuNotes = combinedNotes.filter(note => !quNotes.includes(note));
                const finalNotes = [...quNotes, ...nonQuNotes].slice(0, 30); // Take top 30 prioritized notes

                log.info(`Selected ${finalNotes.length} notes for context, with ${quNotes.length} Qu-related notes prioritized`);

                // Add the selected notes to the context
                if (finalNotes.length > 0) {
                    agentContext += `## Relevant Information\n`;

                    for (const note of finalNotes) {
                        agentContext += `### ${note.title}\n`;

                        // Add relationship information for the note
                        try {
                            const noteObj = becca.getNote(note.noteId);
                            if (noteObj) {
                                // Get parent notes
                                const parentNotes = noteObj.getParentNotes();
                                if (parentNotes && parentNotes.length > 0) {
                                    agentContext += `**Parent notes:** ${parentNotes.map((p: any) => p.title).join(', ')}\n`;
                                }

                                // Get child notes
                                const childNotes = noteObj.getChildNotes();
                                if (childNotes && childNotes.length > 0) {
                                    agentContext += `**Child notes:** ${childNotes.map((c: any) => c.title).join(', ')}\n`;
                                }

                                // Get attributes
                                const attributes = noteObj.getAttributes();
                                if (attributes && attributes.length > 0) {
                                    const filteredAttrs = attributes.filter((a: any) => !a.name.startsWith('_')); // Filter out system attributes
                                    if (filteredAttrs.length > 0) {
                                        agentContext += `**Attributes:** ${filteredAttrs.map((a: any) => `${a.name}=${a.value}`).join(', ')}\n`;
                                    }
                                }

                                // Get backlinks/related notes through relation attributes
                                const relationAttrs = attributes?.filter((a: any) =>
                                    a.name.startsWith('relation:') ||
                                    a.name.startsWith('label:')
                                );

                                if (relationAttrs && relationAttrs.length > 0) {
                                    agentContext += `**Relationships:** ${relationAttrs.map((a: any) => {
                                        const targetNote = becca.getNote(a.value);
                                        const targetTitle = targetNote ? targetNote.title : a.value;
                                        return `${a.name.substring(a.name.indexOf(':') + 1)} → ${targetTitle}`;
                                    }).join(', ')}\n`;
                                }
                            }
                        } catch (error) {
                            log.error(`Error getting relationship info for note ${note.noteId}: ${error}`);
                        }

                        agentContext += '\n';

                        if (note.content) {
                            // Extract relevant content instead of just taking first 2000 chars
                            const relevantContent = await this.extractRelevantContent(note.content, query, 2000);
                            agentContext += `${relevantContent}\n\n`;
                        }
                    }
                }
            } else {
                log.info(`No Qu-related notes found among the ${combinedNotes.length} combined notes`);

                // Just take the top notes by similarity
                const finalNotes = combinedNotes.slice(0, 30); // Take top 30 notes

                if (finalNotes.length > 0) {
                    agentContext += `## Relevant Information\n`;

                    for (const note of finalNotes) {
                        agentContext += `### ${note.title}\n`;

                        // Add relationship information for the note
                        try {
                            const noteObj = becca.getNote(note.noteId);
                            if (noteObj) {
                                // Get parent notes
                                const parentNotes = noteObj.getParentNotes();
                                if (parentNotes && parentNotes.length > 0) {
                                    agentContext += `**Parent notes:** ${parentNotes.map((p: any) => p.title).join(', ')}\n`;
                                }

                                // Get child notes
                                const childNotes = noteObj.getChildNotes();
                                if (childNotes && childNotes.length > 0) {
                                    agentContext += `**Child notes:** ${childNotes.map((c: any) => c.title).join(', ')}\n`;
                                }

                                // Get attributes
                                const attributes = noteObj.getAttributes();
                                if (attributes && attributes.length > 0) {
                                    const filteredAttrs = attributes.filter((a: any) => !a.name.startsWith('_')); // Filter out system attributes
                                    if (filteredAttrs.length > 0) {
                                        agentContext += `**Attributes:** ${filteredAttrs.map((a: any) => `${a.name}=${a.value}`).join(', ')}\n`;
                                    }
                                }

                                // Get backlinks/related notes through relation attributes
                                const relationAttrs = attributes?.filter((a: any) =>
                                    a.name.startsWith('relation:') ||
                                    a.name.startsWith('label:')
                                );

                                if (relationAttrs && relationAttrs.length > 0) {
                                    agentContext += `**Relationships:** ${relationAttrs.map((a: any) => {
                                        const targetNote = becca.getNote(a.value);
                                        const targetTitle = targetNote ? targetNote.title : a.value;
                                        return `${a.name.substring(a.name.indexOf(':') + 1)} → ${targetTitle}`;
                                    }).join(', ')}\n`;
                                }
                            }
                        } catch (error) {
                            log.error(`Error getting relationship info for note ${note.noteId}: ${error}`);
                        }

                        agentContext += '\n';

                        if (note.content) {
                            // Extract relevant content instead of just taking first 2000 chars
                            const relevantContent = await this.extractRelevantContent(note.content, query, 2000);
                            agentContext += `${relevantContent}\n\n`;
                        }
                    }
                }
            }

            // Add thinking process if requested
            if (showThinking) {
                log.info(`Including thinking process in context (showThinking=true)`);
                agentContext += `\n## Reasoning Process\n`;
                const thinkingSummary = contextualThinkingTool.getThinkingSummary(thinkingId);
                log.info(`Thinking summary length: ${thinkingSummary.length} characters`);
                agentContext += thinkingSummary;
            } else {
                log.info(`Skipping thinking process in context (showThinking=false)`);
            }

            // Log stats about the context
            log.info(`Agent tools context built: ${agentContext.length} chars, ${agentContext.split('\n').length} lines`);

            // DEBUG: Log more detailed information about the agent tools context content
            log.info(`Agent tools context content structure: ${this.summarizeContextStructure(agentContext)}`);
            if (agentContext.length < 1000) {
                log.info(`Agent tools context full content (short): ${agentContext}`);
            } else {
                log.info(`Agent tools context first 500 chars: ${agentContext.substring(0, 500)}...`);
                log.info(`Agent tools context last 500 chars: ${agentContext.substring(agentContext.length - 500)}`);
            }

            return agentContext;
        } catch (error) {
            log.error(`Error getting agent tools context: ${error}`);
            return `Error generating enhanced context: ${error}`;
        }
    }

    /**
     * Summarize the structure of a context string for debugging
     * @param context - The context string to summarize
     * @returns A summary of the context structure
     */
    private summarizeContextStructure(context: string): string {
        if (!context) return "Empty context";

        // Count sections and headers
        const sections = context.split('##').length - 1;
        const subSections = context.split('###').length - 1;

        // Count notes referenced
        const noteMatches = context.match(/### [^\n]+/g);
        const noteCount = noteMatches ? noteMatches.length : 0;

        // Extract note titles if present
        let noteTitles = "";
        if (noteMatches && noteMatches.length > 0) {
            noteTitles = ` Note titles: ${noteMatches.slice(0, 3).map(m => m.substring(4)).join(', ')}${noteMatches.length > 3 ? '...' : ''}`;
        }

        return `${sections} main sections, ${subSections} subsections, ${noteCount} notes referenced.${noteTitles}`;
    }

    /**
     * Get semantic context for a note and query
     *
     * @param noteId - The base note ID
     * @param userQuery - The user's query
     * @param maxResults - Maximum number of results to include
     * @returns Formatted context string
     */
    async getSemanticContext(noteId: string, userQuery: string, maxResults: number = 5): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Get related notes from the context extractor
            const [
                parentNotes,
                childNotes,
                linkedNotes
            ] = await Promise.all([
                this.contextExtractor.getParentNotes(noteId, 3),
                this.contextExtractor.getChildContext(noteId, 10).then(context => {
                    // Parse child notes from context string
                    const lines = context.split('\n');
                    const result: {noteId: string, title: string}[] = [];
                    for (const line of lines) {
                        const match = line.match(/- (.*)/);
                        if (match) {
                            // We don't have noteIds in the context string, so use titles only
                            result.push({
                                title: match[1],
                                noteId: '' // Empty noteId since we can't extract it from context
                            });
                        }
                    }
                    return result;
                }),
                this.contextExtractor.getLinkedNotesContext(noteId, 10).then(context => {
                    // Parse linked notes from context string
                    const lines = context.split('\n');
                    const result: {noteId: string, title: string}[] = [];
                    for (const line of lines) {
                        const match = line.match(/- \[(.*?)\]\(trilium:\/\/([a-zA-Z0-9]+)\)/);
                        if (match) {
                            result.push({
                                title: match[1],
                                noteId: match[2]
                            });
                        }
                    }
                    return result;
                })
            ]);

            // Combine all related notes
            const allRelatedNotes = [...parentNotes, ...childNotes, ...linkedNotes];

            // If no related notes, return empty context
            if (allRelatedNotes.length === 0) {
                return '';
            }

            // Convert parent notes from {id, title} to {noteId, title} for consistency
            const normalizedRelatedNotes = allRelatedNotes.map(note => {
                return {
                    noteId: 'id' in note ? note.id : note.noteId,
                    title: note.title
                };
            });

            // Rank notes by relevance to query
            const rankedNotes = await semanticSearch.rankNotesByRelevance(
                normalizedRelatedNotes as Array<{noteId: string, title: string}>,
                userQuery
            );

            // Get content for the top N most relevant notes
            const mostRelevantNotes = rankedNotes.slice(0, maxResults);
            const relevantContent = await Promise.all(
                mostRelevantNotes.map(async note => {
                    const content = await this.contextExtractor.getNoteContent(note.noteId);
                    if (!content) return null;

                    // Format with relevance score and title
                    return `### ${note.title} (Relevance: ${Math.round(note.relevance * 100)}%)\n\n${content}`;
                })
            );

            // If no content retrieved, return empty string
            if (!relevantContent.filter(Boolean).length) {
                return '';
            }

            return `# Relevant Context\n\nThe following notes are most relevant to your query:\n\n${
                relevantContent.filter(Boolean).join('\n\n---\n\n')
            }`;
        } catch (error) {
            log.error(`Error getting semantic context: ${error}`);
            return '';
        }
    }

    /**
     * Get progressive context loading based on depth
     *
     * @param noteId - The base note ID
     * @param depth - Depth level (1-4)
     * @returns Context string with progressively more information
     */
    async getProgressiveContext(noteId: string, depth: number = 1): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Use the existing context extractor method
            return await this.contextExtractor.getProgressiveContext(noteId, depth);
        } catch (error) {
            log.error(`Error getting progressive context: ${error}`);
            return '';
        }
    }

    /**
     * Get smart context that adapts to query complexity
     *
     * @param noteId - The base note ID
     * @param userQuery - The user's query
     * @returns Context string with appropriate level of detail
     */
    async getSmartContext(noteId: string, userQuery: string): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Determine query complexity to adjust context depth
            const complexity = queryEnhancer.estimateQueryComplexity(userQuery);

            // If it's a simple query with low complexity, use progressive context
            if (complexity < 0.3) {
                return await this.getProgressiveContext(noteId, 2); // Just note + parents
            }
            // For medium complexity, include more context
            else if (complexity < 0.7) {
                return await this.getProgressiveContext(noteId, 3); // Note + parents + children
            }
            // For complex queries, use semantic context
            else {
                return await this.getSemanticContext(noteId, userQuery, 7); // More results for complex queries
            }
        } catch (error) {
            log.error(`Error getting smart context: ${error}`);
            // Fallback to basic context extraction
            return await this.contextExtractor.extractContext(noteId);
        }
    }

    /**
     * Clear all context caches
     */
    clearCaches(): void {
        cacheManager.clearAllCaches();
    }

    /**
     * Extract the most relevant portions from a note's content
     * @param content - The full note content
     * @param query - The user's query
     * @param maxChars - Maximum characters to include
     * @returns The most relevant content sections
     */
    private async extractRelevantContent(content: string, query: string, maxChars: number = 2000): Promise<string> {
        if (!content || content.length <= maxChars) {
            return content; // Return full content if it's already short enough
        }

        try {
            // Get the vector search tool for relevance calculation
            const agentManager = aiServiceManager.getInstance();
            const vectorSearchTool = agentManager.getVectorSearchTool();

            // Split content into chunks of reasonable size (300-500 chars with overlap)
            const chunkSize = 400;
            const overlap = 100;
            const chunks: string[] = [];

            for (let i = 0; i < content.length; i += (chunkSize - overlap)) {
                const end = Math.min(i + chunkSize, content.length);
                chunks.push(content.substring(i, end));
                if (end === content.length) break;
            }

            log.info(`Split note content into ${chunks.length} chunks for relevance extraction`);

            // Get embedding provider from service
            const provider = await providerManager.getPreferredEmbeddingProvider();
            if (!provider) {
                throw new Error("No embedding provider available");
            }

            // Get embeddings for the query and all chunks
            const queryEmbedding = await provider.createEmbedding(query);

            // Process chunks in smaller batches to avoid overwhelming the provider
            const batchSize = 5;
            const chunkEmbeddings = [];

            for (let i = 0; i < chunks.length; i += batchSize) {
                const batch = chunks.slice(i, i + batchSize);
                const batchEmbeddings = await Promise.all(
                    batch.map(chunk => provider.createEmbedding(chunk))
                );
                chunkEmbeddings.push(...batchEmbeddings);
            }

            // Calculate similarity between query and each chunk
            const similarities: Array<{index: number, similarity: number, content: string}> =
                chunkEmbeddings.map((embedding, index) => {
                    const similarity = provider.calculateSimilarity(queryEmbedding, embedding);
                    return { index, similarity, content: chunks[index] };
                });

            // Sort chunks by similarity (most relevant first)
            similarities.sort((a, b) => b.similarity - a.similarity);

            // DEBUG: Log some info about the top chunks
            log.info(`Top 3 most relevant chunks for query "${query.substring(0, 30)}..." (out of ${chunks.length} total):`);
            similarities.slice(0, 3).forEach((chunk, idx) => {
                log.info(`  Chunk ${idx+1}: Similarity ${Math.round(chunk.similarity * 100)}%, Content: "${chunk.content.substring(0, 50)}..."`);
            });

            // Take the most relevant chunks up to maxChars
            let result = '';
            let totalChars = 0;
            let chunksIncluded = 0;

            for (const chunk of similarities) {
                if (totalChars + chunk.content.length > maxChars) {
                    // If adding full chunk would exceed limit, add as much as possible
                    const remainingSpace = maxChars - totalChars;
                    if (remainingSpace > 100) { // Only add if we can include something meaningful
                        result += `\n...\n${chunk.content.substring(0, remainingSpace)}...`;
                        log.info(`  Added partial chunk with similarity ${Math.round(chunk.similarity * 100)}% (${remainingSpace} chars)`);
                    }
                    break;
                }

                if (result.length > 0) result += '\n...\n';
                result += chunk.content;
                totalChars += chunk.content.length;
                chunksIncluded++;
            }

            log.info(`Extracted ${totalChars} chars of relevant content from ${content.length} chars total (${chunksIncluded} chunks included)`);
            return result;
        } catch (error) {
            log.error(`Error extracting relevant content: ${error}`);
            // Fallback to simple truncation if extraction fails
            return content.substring(0, maxChars) + '...';
        }
    }
}

// Export singleton instance
export default new ContextService();
