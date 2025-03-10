import type { Request, Response } from "express";
import log from "../../services/log.js";
import options from "../../services/options.js";
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import becca from "../../becca/becca.js";
import vectorStore from "../../services/llm/embeddings/vector_store.js";
import providerManager from "../../services/llm/embeddings/providers.js";
import type { Message, ChatCompletionOptions } from "../../services/llm/ai_interface.js";
// Import this way to prevent immediate instantiation
import * as aiServiceManagerModule from "../../services/llm/ai_service_manager.js";
import triliumContextService from "../../services/llm/trilium_context_service.js";
import sql from "../../services/sql.js";

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
 * Initialize the cleanup timer if not already running
 * Only call this after database is initialized
 */
function initializeCleanupTimer() {
    if (cleanupInitialized) {
        return;
    }

    // Utility function to clean sessions older than 12 hours
    function cleanupOldSessions() {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        for (const [sessionId, session] of sessions.entries()) {
            if (session.lastActive < twelveHoursAgo) {
                sessions.delete(sessionId);
            }
        }
    }

    // Run cleanup every hour
    setInterval(cleanupOldSessions, 60 * 60 * 1000);
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
 * Create a new LLM chat session
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
 * Get session details
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
 * Update session properties
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
 * List active sessions
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
 * Delete a session
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
 * Build context from notes
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
        .map((source, index) => {
            // Format each note as a section in the context
            return `[NOTE ${index + 1}: ${source.title}]\n${source.content || 'No content available'}`;
        })
        .join('\n\n');

    if (!noteContexts) {
        console.log("After filtering, no valid note contexts remain - using just the query");
        return query || '';
    }

    // Build a complete context prompt
    return `I'll provide you with relevant notes from my knowledge base to help answer the question. Please use this information when responding:

${noteContexts}

Now, based on the above notes, please answer: ${query}`;
}

/**
 * Send a message to the AI
 */
async function sendMessage(req: Request, res: Response) {
    try {
        // Extract parameters differently based on the request method
        let content, useAdvancedContext, sessionId;

        if (req.method === 'POST') {
            // For POST requests, get content from the request body
            const requestBody = req.body || {};
            content = requestBody.content;
            useAdvancedContext = requestBody.useAdvancedContext || false;
        } else if (req.method === 'GET') {
            // For GET (streaming) requests, get format from query params
            // The content should have been sent in a previous POST request
            useAdvancedContext = req.query.useAdvancedContext === 'true';
            content = ''; // We don't need content for GET requests
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
                const results = await triliumContextService.processQuery(messageContent, service, contextNoteId);

                // Get the generated context
                const context = results.context;
                sourceNotes = results.notes;

                // Add system message with the context
                const contextMessage: Message = {
                    role: 'system',
                    content: context
                };

                // Format all messages for the AI
                const aiMessages: Message[] = [
                    contextMessage,
                    ...session.messages.slice(-10).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ];

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
                            similarity: note.similarity,
                            branchId: note.branchId
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

                // Add system message with the context
                const contextMessage: Message = {
                    role: 'system',
                    content: context
                };

                // Format all messages for the AI
                const aiMessages: Message[] = [
                    contextMessage,
                    ...session.messages.slice(-10).map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                ];

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
                            similarity: note.similarity,
                            branchId: note.branchId
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
        log.error(`Error sending message to LLM: ${error.message}`);
        throw new Error(`Failed to send message: ${error.message}`);
    }
}

export default {
    createSession,
    getSession,
    updateSession,
    listSessions,
    deleteSession,
    sendMessage
};
