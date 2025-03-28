import type { Request, Response } from "express";
import log from "../../services/log.js";
import options from "../../services/options.js";
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import becca from "../../becca/becca.js";
import vectorStore from "../../services/llm/embeddings/index.js";
import providerManager from "../../services/llm/providers/providers.js";
import type { Message, ChatCompletionOptions } from "../../services/llm/ai_interface.js";
// Import this way to prevent immediate instantiation
import * as aiServiceManagerModule from "../../services/llm/ai_service_manager.js";
import contextService from "../../services/llm/context_service.js";
import sql from "../../services/sql.js";
// Import the index service for knowledge base management
import indexService from "../../services/llm/index_service.js";
import { CONTEXT_PROMPTS, ERROR_PROMPTS, FORMATTING_PROMPTS } from '../../services/llm/constants/llm_prompt_constants.js';
import { LLM_CONSTANTS } from '../../services/llm/constants/provider_constants.js';

// Define basic interfaces
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    lastActive: Date;
    noteContext?: string; // Optional noteId that provides context
    metadata: Record<string, any>;
}

interface NoteSource {
    noteId: string;
    title: string;
    content?: string;
    similarity?: number;
    branchId?: string;
}

interface SessionOptions {
    title?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    provider?: string;
    contextNoteId?: string;
}

// In-memory storage for sessions
// In a production app, this should be stored in a database
const sessions = new Map<string, ChatSession>();

// Flag to track if cleanup timer has been initialized
let cleanupInitialized = false;

/**
 * Initialize the session cleanup timer to remove old/inactive sessions
 * Only call this after database is initialized
 */
function initializeCleanupTimer() {
    if (cleanupInitialized) {
        return;
    }

    // Clean sessions that have expired based on the constants
    function cleanupOldSessions() {
        const expiryTime = new Date(Date.now() - LLM_CONSTANTS.SESSION.SESSION_EXPIRY_MS);
        for (const [sessionId, session] of sessions.entries()) {
            if (session.lastActive < expiryTime) {
                sessions.delete(sessionId);
            }
        }
    }

    // Run cleanup at the configured interval
    setInterval(cleanupOldSessions, LLM_CONSTANTS.SESSION.CLEANUP_INTERVAL_MS);
    cleanupInitialized = true;
}

/**
 * Check if the database is initialized
 */
function isDatabaseInitialized(): boolean {
    try {
        options.getOption('initialized');
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Get the AI service manager in a way that doesn't crash at startup
 */
function safelyUseAIManager(): boolean {
    // Only use AI manager if database is initialized
    if (!isDatabaseInitialized()) {
        return false;
    }

    // Try to access the manager - will create instance only if needed
    try {
        return aiServiceManagerModule.default.isAnyServiceAvailable();
    } catch (error) {
        log.error(`Error accessing AI service manager: ${error}`);
        return false;
    }
}

/**
 * @swagger
 * /api/llm/sessions:
 *   post:
 *     summary: Create a new LLM chat session
 *     operationId: llm-create-session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title for the chat session
 *               systemPrompt:
 *                 type: string
 *                 description: System message to set the behavior of the assistant
 *               temperature:
 *                 type: number
 *                 description: Temperature parameter for the LLM (0.0-1.0)
 *               maxTokens:
 *                 type: integer
 *                 description: Maximum tokens to generate in responses
 *               model:
 *                 type: string
 *                 description: Specific model to use (depends on provider)
 *               provider:
 *                 type: string
 *                 description: LLM provider to use (e.g., 'openai', 'anthropic', 'ollama')
 *               contextNoteId:
 *                 type: string
 *                 description: Note ID to use as context for the session
 *     responses:
 *       '200':
 *         description: Successfully created session
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 title:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function createSession(req: Request, res: Response) {
    try {
        // Initialize cleanup if not already done
        initializeCleanupTimer();

        const options: SessionOptions = req.body || {};
        const title = options.title || 'Chat Session';

        const sessionId = uuidv4();
        const now = new Date();

        // Initial system message if provided
        const messages: ChatMessage[] = [];
        if (options.systemPrompt) {
            messages.push({
                role: 'system',
                content: options.systemPrompt,
                timestamp: now
            });
        }

        // Store session info
        sessions.set(sessionId, {
            id: sessionId,
            title,
            messages,
            createdAt: now,
            lastActive: now,
            noteContext: options.contextNoteId,
            metadata: {
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                model: options.model,
                provider: options.provider
            }
        });

        return {
            id: sessionId,
            title,
            createdAt: now
        };
    } catch (error: any) {
        log.error(`Error creating LLM session: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to create LLM session: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}:
 *   get:
 *     summary: Retrieve a specific chat session by ID
 *     operationId: llm-get-session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Chat session details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [user, assistant, system]
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 lastActive:
 *                   type: string
 *                   format: date-time
 *       '404':
 *         description: Session not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getSession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;

        // Check if session exists
        const session = sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session with ID ${sessionId} not found`);
        }

        // Return session without internal metadata
        return {
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            lastActive: session.lastActive,
            messages: session.messages,
            noteContext: session.noteContext
        };
    } catch (error: any) {
        log.error(`Error getting LLM session: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to get session: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}:
 *   put:
 *     summary: Update a chat session's settings
 *     operationId: llm-update-session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated title for the session
 *               systemPrompt:
 *                 type: string
 *                 description: Updated system prompt
 *               temperature:
 *                 type: number
 *                 description: Updated temperature setting
 *               maxTokens:
 *                 type: integer
 *                 description: Updated maximum tokens setting
 *               model:
 *                 type: string
 *                 description: Updated model selection
 *               provider:
 *                 type: string
 *                 description: Updated provider selection
 *               contextNoteId:
 *                 type: string
 *                 description: Updated note ID for context
 *     responses:
 *       '200':
 *         description: Session successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       '404':
 *         description: Session not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function updateSession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;
        const updates = req.body || {};

        // Check if session exists
        const session = sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session with ID ${sessionId} not found`);
        }

        // Update allowed fields
        if (updates.title) {
            session.title = updates.title;
        }

        if (updates.noteContext) {
            session.noteContext = updates.noteContext;
        }

        // Update metadata
        if (updates.temperature !== undefined) {
            session.metadata.temperature = updates.temperature;
        }

        if (updates.maxTokens !== undefined) {
            session.metadata.maxTokens = updates.maxTokens;
        }

        if (updates.model) {
            session.metadata.model = updates.model;
        }

        if (updates.provider) {
            session.metadata.provider = updates.provider;
        }

        // Update timestamp
        session.lastActive = new Date();

        return {
            id: session.id,
            title: session.title,
            updatedAt: session.lastActive
        };
    } catch (error: any) {
        log.error(`Error updating LLM session: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to update session: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/sessions:
 *   get:
 *     summary: List all chat sessions
 *     operationId: llm-list-sessions
 *     responses:
 *       '200':
 *         description: List of chat sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   lastActive:
 *                     type: string
 *                     format: date-time
 *                   messageCount:
 *                     type: integer
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function listSessions(req: Request, res: Response) {
    try {
        const sessionList = Array.from(sessions.values()).map(session => ({
            id: session.id,
            title: session.title,
            createdAt: session.createdAt,
            lastActive: session.lastActive,
            messageCount: session.messages.length
        }));

        // Sort by last activity (most recent first)
        sessionList.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

        return {
            sessions: sessionList
        };
    } catch (error: any) {
        log.error(`Error listing LLM sessions: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to list sessions: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a chat session
 *     operationId: llm-delete-session
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Session successfully deleted
 *       '404':
 *         description: Session not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function deleteSession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;

        // Check if session exists
        if (!sessions.has(sessionId)) {
            throw new Error(`Session with ID ${sessionId} not found`);
        }

        // Delete session
        sessions.delete(sessionId);

        return {
            success: true,
            message: `Session ${sessionId} deleted successfully`
        };
    } catch (error: any) {
        log.error(`Error deleting LLM session: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to delete session: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Find relevant notes based on search query
 */
async function findRelevantNotes(content: string, contextNoteId: string | null = null, limit = 5): Promise<NoteSource[]> {
    try {
        // If database is not initialized, we can't do this
        if (!isDatabaseInitialized()) {
            return [];
        }

        // Check if embeddings are available
        const enabledProviders = await providerManager.getEnabledEmbeddingProviders();
        if (enabledProviders.length === 0) {
            log.info("No embedding providers available, can't find relevant notes");
            return [];
        }

        // If content is too short, don't bother
        if (content.length < 3) {
            return [];
        }

        // Get the embedding for the query
        const provider = enabledProviders[0];
        const embedding = await provider.generateEmbeddings(content);

        let results;
        if (contextNoteId) {
            // For branch context, get notes specifically from that branch

            // TODO: This is a simplified implementation - we need to
            // properly get all notes in the subtree starting from contextNoteId

            // For now, just get direct children of the context note
            const contextNote = becca.notes[contextNoteId];
            if (!contextNote) {
                return [];
            }

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

                    if (similarity > 0.65) {
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
 * Build a prompt with context from relevant notes
 */
function buildContextFromNotes(sources: NoteSource[], query: string): string {
    console.log("Building context from notes with query:", query);
    console.log("Sources length:", sources ? sources.length : 0);

    // If no sources are available, just return the query without additional context
    if (!sources || sources.length === 0) {
        console.log("No sources available, using just the query");
        return query || '';
    }

    const noteContexts = sources
        .filter(source => source.content) // Only include sources with content
        .map((source) => {
            // Format each note with its title as a natural heading
            return `### ${source.title}\n${source.content || 'No content available'}`;
        })
        .join('\n\n');

    if (!noteContexts) {
        console.log("After filtering, no valid note contexts remain - using just the query");
        return query || '';
    }

    // Use the template from the constants file, replacing placeholders
    return CONTEXT_PROMPTS.CONTEXT_NOTES_WRAPPER
        .replace('{noteContexts}', noteContexts)
        .replace('{query}', query);
}

/**
 * @swagger
 * /api/llm/sessions/{sessionId}/messages:
 *   post:
 *     summary: Send a message to an LLM and get a response
 *     operationId: llm-send-message
 *     parameters:
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The user message to send to the LLM
 *               options:
 *                 type: object
 *                 description: Optional parameters for this specific message
 *                 properties:
 *                   temperature:
 *                     type: number
 *                   maxTokens:
 *                     type: integer
 *                   model:
 *                     type: string
 *                   provider:
 *                     type: string
 *               includeContext:
 *                 type: boolean
 *                 description: Whether to include relevant notes as context
 *               useNoteContext:
 *                 type: boolean
 *                 description: Whether to use the session's context note
 *     responses:
 *       '200':
 *         description: LLM response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       noteId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       similarity:
 *                         type: number
 *                 sessionId:
 *                   type: string
 *       '404':
 *         description: Session not found
 *       '500':
 *         description: Error processing request
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function sendMessage(req: Request, res: Response) {
    try {
        // Extract parameters differently based on the request method
        let content, useAdvancedContext, showThinking, sessionId;

        if (req.method === 'POST') {
            // For POST requests, get content from the request body
            const requestBody = req.body || {};
            content = requestBody.content;
            useAdvancedContext = requestBody.useAdvancedContext || false;
            showThinking = requestBody.showThinking || false;

            // Add logging for POST requests
            log.info(`LLM POST message: sessionId=${req.params.sessionId}, useAdvancedContext=${useAdvancedContext}, showThinking=${showThinking}, contentLength=${content ? content.length : 0}`);
        } else if (req.method === 'GET') {
            // For GET (streaming) requests, get format from query params
            // The content should have been sent in a previous POST request
            useAdvancedContext = req.query.useAdvancedContext === 'true';
            showThinking = req.query.showThinking === 'true';
            content = ''; // We don't need content for GET requests

            // Add logging for GET requests
            log.info(`LLM GET stream: sessionId=${req.params.sessionId}, useAdvancedContext=${useAdvancedContext}, showThinking=${showThinking}`);
        }

        // Get sessionId from URL params since it's part of the route
        sessionId = req.params.sessionId;

        // Get the Accept header once at the start
        const acceptHeader = req.get('Accept');
        const isStreamingRequest = req.method === 'GET' && req.query.format === 'stream';

        // For GET requests, ensure we have the format=stream parameter
        if (req.method === 'GET' && (!req.query.format || req.query.format !== 'stream')) {
            throw new Error('Stream format parameter is required for GET requests');
        }

        // For POST requests, validate the content
        if (req.method === 'POST' && (!content || typeof content !== 'string' || content.trim().length === 0)) {
            throw new Error('Content cannot be empty');
        }

        // Get session
        if (!sessionId || !sessions.has(sessionId)) {
            throw new Error('Session not found');
        }

        const session = sessions.get(sessionId)!;
        session.lastActive = new Date();

        // For POST requests, store the user message
        if (req.method === 'POST' && content) {
            // Add message to session
            session.messages.push({
                role: 'user',
                content,
                timestamp: new Date()
            });

            // Log a preview of the message
            log.info(`Processing LLM message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
        }

        // Check if AI services are available
        if (!safelyUseAIManager()) {
            throw new Error('AI services are not available');
        }

        // Get the AI service manager
        const aiServiceManager = aiServiceManagerModule.default.getInstance();
        // Get the default service - just use the first available one
        const availableProviders = aiServiceManager.getAvailableProviders();
        let service = null;

        if (availableProviders.length > 0) {
            // Use the first available provider
            const providerName = availableProviders[0];
            // We know the manager has a 'services' property from our code inspection,
            // but TypeScript doesn't know that from the interface.
            // This is a workaround to access it
            service = (aiServiceManager as any).services[providerName];
        }

        if (!service) {
            throw new Error('No AI service is available');
        }

        // Information to return to the client
        let aiResponse = '';
        let sourceNotes: NoteSource[] = [];

        // For POST requests, we need to process the message
        // For GET (streaming) requests, we use the latest user message from the session
        if (req.method === 'POST' || isStreamingRequest) {
            // Get the latest user message for context
            const latestUserMessage = session.messages
                .filter(msg => msg.role === 'user')
                .pop();

            if (!latestUserMessage && req.method === 'GET') {
                throw new Error('No user message found in session');
            }

            // Use the latest message content for GET requests
            const messageContent = req.method === 'POST' ? content : latestUserMessage!.content;

            // If Advanced Context is enabled, we use the improved method
            if (useAdvancedContext) {
                // Use the Trilium-specific approach
                const contextNoteId = session.noteContext || null;

                // Log that we're calling contextService with the parameters
                log.info(`Using enhanced context with: noteId=${contextNoteId}, showThinking=${showThinking}`);

                const results = await contextService.processQuery(
                    messageContent,
                    service,
                    contextNoteId,
                    showThinking
                );

                // Get the generated context
                const context = results.context;
                // Convert from NoteSearchResult to NoteSource
                sourceNotes = results.sources.map(source => ({
                    noteId: source.noteId,
                    title: source.title,
                    content: source.content || undefined, // Convert null to undefined
                    similarity: source.similarity
                }));

                // Build context from relevant notes
                const contextFromNotes = buildContextFromNotes(sourceNotes, messageContent);

                // Add system message with the context
                const contextMessage: Message = {
                    role: 'system',
                    content: context
                };

                // DEBUG: Log context details before sending to LLM
                log.info(`${FORMATTING_PROMPTS.DIVIDERS.CONTENT_SECTION} Context begins with: "${context.substring(0, 200)}..."`);
                log.info(`${FORMATTING_PROMPTS.DIVIDERS.CONTENT_SECTION} Context ends with: "...${context.substring(context.length - 200)}"`);
                log.info(`${FORMATTING_PROMPTS.DIVIDERS.NOTE_SECTION} Number of notes included: ${sourceNotes.length}`);

                // Format messages for the LLM using the proper context
                const aiMessages = await contextService.buildMessagesWithContext(
                    session.messages.slice(-LLM_CONSTANTS.SESSION.MAX_SESSION_MESSAGES).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    context,
                    service
                );

                // Add enhanced debug logging
                if (service.constructor.name === 'OllamaService') {
                    // Log condensed version of the context so we can see if it's being properly formatted
                    console.log(`Sending context to Ollama with length: ${context.length} chars`);
                    console.log(`Context first 200 chars: ${context.substring(0, 200).replace(/\n/g, '\\n')}...`);
                    console.log(`Context last 200 chars: ${context.substring(context.length - 200).replace(/\n/g, '\\n')}...`);

                    // Log the first user message to verify context injection is working
                    const userMsg = aiMessages.find(m => m.role === 'user');
                    if (userMsg) {
                        console.log(`First user message (first 200 chars): ${userMsg.content.substring(0, 200).replace(/\n/g, '\\n')}...`);
                    }
                }

                // DEBUG: Log message structure being sent to LLM
                log.info(`Message structure being sent to LLM: ${aiMessages.length} messages total`);

                // Configure chat options from session metadata
                const chatOptions: ChatCompletionOptions = {
                    temperature: session.metadata.temperature || 0.7,
                    maxTokens: session.metadata.maxTokens,
                    model: session.metadata.model,
                    stream: isStreamingRequest ? true : undefined
                };

                // Process based on whether this is a streaming request
                if (isStreamingRequest) {
                    // Set streaming headers once
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');

                    // Flag to indicate we've handled the response directly
                    // This lets the route handler know not to process the result
                    (res as any).triliumResponseHandled = true;

                    let messageContent = '';

                    try {
                        // Use the correct method name: generateChatCompletion
                        const response = await service.generateChatCompletion(aiMessages, chatOptions);

                        // Handle streaming if the response includes a stream method
                        if (response.stream) {
                            await response.stream((chunk: { text: string; done: boolean }) => {
                                if (chunk.text) {
                                    messageContent += chunk.text;
                                    // Only write if the response hasn't finished
                                    if (!res.writableEnded) {
                                        res.write(`data: ${JSON.stringify({ content: chunk.text })}\n\n`);
                                    }
                                }

                                if (chunk.done) {
                                    // Signal the end of the stream when done, only if not already ended
                                    if (!res.writableEnded) {
                                        res.write('data: [DONE]\n\n');
                                        res.end();
                                    }
                                }
                            });
                        } else {
                            // If no streaming available, send the response as a single chunk
                            messageContent = response.text;
                            // Only write if the response hasn't finished
                            if (!res.writableEnded) {
                                res.write(`data: ${JSON.stringify({ content: messageContent })}\n\n`);
                                res.write('data: [DONE]\n\n');
                                res.end();
                            }
                        }

                        // Store the full response for the session
                        aiResponse = messageContent;

                        // Store the assistant's response in the session
                        session.messages.push({
                            role: 'assistant',
                            content: aiResponse,
                            timestamp: new Date()
                        });

                        // For streaming requests we don't return anything as we've already sent the response
                        return null;
                    } catch (streamingError: any) {
                        // If streaming fails and we haven't sent a response yet, throw the error
                        if (!res.headersSent) {
                            throw streamingError;
                        } else {
                            // If headers were already sent, try to send an error event
                            try {
                                if (!res.writableEnded) {
                                    res.write(`data: ${JSON.stringify({ error: streamingError.message })}\n\n`);
                                    res.write('data: [DONE]\n\n');
                                    res.end();
                                }
                            } catch (e) {
                                log.error(`Failed to write streaming error: ${e}`);
                            }
                            return null;
                        }
                    }
                } else {
                    // Non-streaming approach for POST requests
                    const response = await service.generateChatCompletion(aiMessages, chatOptions);
                    aiResponse = response.text; // Extract the text from the response

                    // Store the assistant's response in the session
                    session.messages.push({
                        role: 'assistant',
                        content: aiResponse,
                        timestamp: new Date()
                    });

                    // Return the response for POST requests
                    return {
                        content: aiResponse,
                        sources: sourceNotes.map(note => ({
                            noteId: note.noteId,
                            title: note.title,
                            similarity: note.similarity
                        }))
                    };
                }
            } else {
                // Original approach - find relevant notes through direct embedding comparison
                const relevantNotes = await findRelevantNotes(
                    messageContent,
                    session.noteContext || null,
                    5
                );

                sourceNotes = relevantNotes;

                // Build context from relevant notes
                const context = buildContextFromNotes(relevantNotes, messageContent);

                // Get messages with context properly formatted for the specific LLM provider
                const aiMessages = await contextService.buildMessagesWithContext(
                    session.messages.slice(-LLM_CONSTANTS.SESSION.MAX_SESSION_MESSAGES).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    context,
                    service
                );

                // Configure chat options from session metadata
                const chatOptions: ChatCompletionOptions = {
                    temperature: session.metadata.temperature || 0.7,
                    maxTokens: session.metadata.maxTokens,
                    model: session.metadata.model,
                    stream: isStreamingRequest ? true : undefined
                };

                if (isStreamingRequest) {
                    // Set streaming headers once
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');

                    // Flag to indicate we've handled the response directly
                    // This lets the route handler know not to process the result
                    (res as any).triliumResponseHandled = true;

                    let messageContent = '';

                    try {
                        // Use the correct method name: generateChatCompletion
                        const response = await service.generateChatCompletion(aiMessages, chatOptions);

                        // Handle streaming if the response includes a stream method
                        if (response.stream) {
                            await response.stream((chunk: { text: string; done: boolean }) => {
                                if (chunk.text) {
                                    messageContent += chunk.text;
                                    // Only write if the response hasn't finished
                                    if (!res.writableEnded) {
                                        res.write(`data: ${JSON.stringify({ content: chunk.text })}\n\n`);
                                    }
                                }

                                if (chunk.done) {
                                    // Signal the end of the stream when done, only if not already ended
                                    if (!res.writableEnded) {
                                        res.write('data: [DONE]\n\n');
                                        res.end();
                                    }
                                }
                            });
                        } else {
                            // If no streaming available, send the response as a single chunk
                            messageContent = response.text;
                            // Only write if the response hasn't finished
                            if (!res.writableEnded) {
                                res.write(`data: ${JSON.stringify({ content: messageContent })}\n\n`);
                                res.write('data: [DONE]\n\n');
                                res.end();
                            }
                        }

                        // Store the full response for the session
                        aiResponse = messageContent;

                        // Store the assistant's response in the session
                        session.messages.push({
                            role: 'assistant',
                            content: aiResponse,
                            timestamp: new Date()
                        });

                        // For streaming requests we don't return anything as we've already sent the response
                        return null;
                    } catch (streamingError: any) {
                        // If streaming fails and we haven't sent a response yet, throw the error
                        if (!res.headersSent) {
                            throw streamingError;
                        } else {
                            // If headers were already sent, try to send an error event
                            try {
                                if (!res.writableEnded) {
                                    res.write(`data: ${JSON.stringify({ error: streamingError.message })}\n\n`);
                                    res.write('data: [DONE]\n\n');
                                    res.end();
                                }
                            } catch (e) {
                                log.error(`Failed to write streaming error: ${e}`);
                            }
                            return null;
                        }
                    }
                } else {
                    // Non-streaming approach for POST requests
                    const response = await service.generateChatCompletion(aiMessages, chatOptions);
                    aiResponse = response.text; // Extract the text from the response

                    // Store the assistant's response in the session
                    session.messages.push({
                        role: 'assistant',
                        content: aiResponse,
                        timestamp: new Date()
                    });

                    // Return the response for POST requests
                    return {
                        content: aiResponse,
                        sources: sourceNotes.map(note => ({
                            noteId: note.noteId,
                            title: note.title,
                            similarity: note.similarity
                        }))
                    };
                }
            }
        } else {
            // If it's not a POST or streaming GET request, return the session's message history
            return {
                id: session.id,
                messages: session.messages
            };
        }
    } catch (error: any) {
        log.error(`Error in LLM query processing: ${error}`);
        return {
            error: ERROR_PROMPTS.USER_ERRORS.GENERAL_ERROR
        };
    }
}

/**
 * @swagger
 * /api/llm/index/stats:
 *   get:
 *     summary: Get statistics about the vector index
 *     operationId: llm-index-stats
 *     responses:
 *       '200':
 *         description: Vector index statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmbeddings:
 *                   type: integer
 *                 totalIndexedNotes:
 *                   type: integer
 *                 lastIndexed:
 *                   type: string
 *                   format: date-time
 *                 embeddingProvider:
 *                   type: string
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getIndexStats(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const stats = await indexService.getIndexingStats();
        return stats;
    } catch (error: any) {
        log.error(`Error getting index stats: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to get index stats: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/index/start:
 *   post:
 *     summary: Start or restart the indexing process
 *     operationId: llm-start-indexing
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forceReindex:
 *                 type: boolean
 *                 description: Whether to force reindexing of all notes
 *               branchId:
 *                 type: string
 *                 description: Optional branch ID to limit indexing scope
 *     responses:
 *       '200':
 *         description: Indexing process started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 notesToIndex:
 *                   type: integer
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function startIndexing(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const { force, batchSize } = req.body || {};

        let result;
        if (batchSize) {
            // Run a limited batch indexing
            result = await indexService.runBatchIndexing(batchSize);
            return {
                success: result,
                message: result ? `Batch indexing started with size ${batchSize}` : 'Indexing already in progress'
            };
        } else {
            // Start full indexing
            result = await indexService.startFullIndexing(force);
            return {
                success: result,
                message: result ? 'Full indexing started' : 'Indexing already in progress or not needed'
            };
        }
    } catch (error: any) {
        log.error(`Error starting indexing: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to start indexing: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/index/failed:
 *   get:
 *     summary: Get list of notes that failed to be indexed
 *     operationId: llm-failed-indexes
 *     responses:
 *       '200':
 *         description: List of failed note indexes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   noteId:
 *                     type: string
 *                   title:
 *                     type: string
 *                   error:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function getFailedIndexes(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
        const failedNotes = await indexService.getFailedIndexes(limit);

        return {
            count: failedNotes.length,
            failedNotes
        };
    } catch (error: any) {
        log.error(`Error getting failed indexes: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to get failed indexes: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/index/failed/{noteId}/retry:
 *   post:
 *     summary: Retry indexing a specific failed note
 *     operationId: llm-retry-failed-index
 *     parameters:
 *       - name: noteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Retry process started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '404':
 *         description: Failed note not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function retryFailedIndex(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const { noteId } = req.params;
        if (!noteId) {
            throw new Error('Note ID is required');
        }

        const success = await indexService.retryFailedNote(noteId);

        return {
            success,
            message: success ? `Note ${noteId} queued for retry` : `Note ${noteId} not found in failed queue`
        };
    } catch (error: any) {
        log.error(`Error retrying failed index: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to retry index: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/index/failed/retry-all:
 *   post:
 *     summary: Retry indexing all failed notes
 *     operationId: llm-retry-all-failed
 *     responses:
 *       '200':
 *         description: Retry process started for all failed notes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function retryAllFailedIndexes(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const count = await indexService.retryAllFailedNotes();

        return {
            success: true,
            count,
            message: `${count} notes queued for retry`
        };
    } catch (error: any) {
        log.error(`Error retrying all failed indexes: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to retry indexes: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/similar:
 *   post:
 *     summary: Find notes similar to the provided content
 *     operationId: llm-find-similar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Content to find similar notes for
 *               limit:
 *                 type: integer
 *                 description: Maximum number of results to return
 *               threshold:
 *                 type: number
 *                 description: Similarity threshold (0.0-1.0)
 *     responses:
 *       '200':
 *         description: List of similar notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   noteId:
 *                     type: string
 *                   title:
 *                     type: string
 *                   similarity:
 *                     type: number
 *                   branchId:
 *                     type: string
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function findSimilarNotes(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const { query, contextNoteId, limit } = req.body || {};

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Query is required');
        }

        const similarNotes = await indexService.findSimilarNotes(
            query,
            contextNoteId,
            limit || 10
        );

        return {
            count: similarNotes.length,
            similarNotes
        };
    } catch (error: any) {
        log.error(`Error finding similar notes: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to find similar notes: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/generate-context:
 *   post:
 *     summary: Generate context from similar notes for a query
 *     operationId: llm-generate-context
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Query to generate context for
 *               limit:
 *                 type: integer
 *                 description: Maximum number of notes to include
 *               contextNoteId:
 *                 type: string
 *                 description: Optional note ID to provide additional context
 *     responses:
 *       '200':
 *         description: Generated context and sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 context:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       noteId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       similarity:
 *                         type: number
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function generateQueryContext(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const { query, contextNoteId, depth } = req.body || {};

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Query is required');
        }

        const context = await indexService.generateQueryContext(
            query,
            contextNoteId,
            depth || 2
        );

        return {
            context,
            length: context.length
        };
    } catch (error: any) {
        log.error(`Error generating query context: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to generate query context: ${error.message || 'Unknown error'}`);
    }
}

/**
 * @swagger
 * /api/llm/index/note/{noteId}:
 *   post:
 *     summary: Index or reindex a specific note
 *     operationId: llm-index-note
 *     parameters:
 *       - name: noteId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 description: Whether to force reindexing even if already indexed
 *     responses:
 *       '200':
 *         description: Note indexing result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       '404':
 *         description: Note not found
 *     security:
 *       - session: []
 *     tags: ["llm"]
 */
async function indexNote(req: Request, res: Response) {
    try {
        if (!isDatabaseInitialized()) {
            throw new Error('Database is not initialized yet');
        }

        const { noteId } = req.params;
        if (!noteId) {
            throw new Error('Note ID is required');
        }

        // Check if note exists
        const note = becca.getNote(noteId);
        if (!note) {
            throw new Error(`Note ${noteId} not found`);
        }

        const success = await indexService.generateNoteIndex(noteId);

        return {
            success,
            noteId,
            noteTitle: note.title,
            message: success ? `Note "${note.title}" indexed successfully` : `Failed to index note "${note.title}"`
        };
    } catch (error: any) {
        log.error(`Error indexing note: ${error.message || 'Unknown error'}`);
        throw new Error(`Failed to index note: ${error.message || 'Unknown error'}`);
    }
}

export default {
    // Chat session management
    createSession,
    getSession,
    updateSession,
    listSessions,
    deleteSession,
    sendMessage,

    // Knowledge base index management
    getIndexStats,
    startIndexing,
    getFailedIndexes,
    retryFailedIndex,
    retryAllFailedIndexes,
    findSimilarNotes,
    generateQueryContext,
    indexNote
};
