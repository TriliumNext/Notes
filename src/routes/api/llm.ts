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
 * Find relevant notes using vector embeddings
 */
async function findRelevantNotes(query: string, contextNoteId: string | null = null, limit = 5): Promise<NoteSource[]> {
    try {
        // Only proceed if database is initialized
        if (!isDatabaseInitialized()) {
            log.info('Database not initialized, skipping vector search');
            return [{
                noteId: "root",
                title: "Database not initialized yet",
                content: "Please wait for database initialization to complete."
            }];
        }

        // Get the default embedding provider
        let providerId;
        try {
            // @ts-ignore - embeddingsDefaultProvider exists but might not be in the TypeScript definitions
            providerId = await options.getOption('embeddingsDefaultProvider') || 'openai';
        } catch (error) {
            log.info('Could not get default embedding provider, using mock data');
            return [{
                noteId: "root",
                title: "Embeddings not configured",
                content: "Embedding provider not available"
            }];
        }

        const provider = providerManager.getEmbeddingProvider(providerId);

        if (!provider) {
            log.info(`Embedding provider ${providerId} not found, using mock data`);
            return [{
                noteId: "root",
                title: "Embeddings not available",
                content: "No embedding provider available"
            }];
        }

        // Generate embedding for the query
        const embedding = await provider.generateEmbeddings(query);

        // Find similar notes
        const modelId = 'default'; // Use default model for the provider
        const similarNotes = await vectorStore.findSimilarNotes(
            embedding, providerId, modelId, limit, 0.6 // Lower threshold to find more results
        );

        // If a context note was provided, check if we should include its children
        if (contextNoteId) {
            const contextNote = becca.getNote(contextNoteId);
            if (contextNote) {
                const childNotes = contextNote.getChildNotes();
                if (childNotes.length > 0) {
                    // Add relevant children that weren't already included
                    const childIds = new Set(childNotes.map(note => note.noteId));
                    const existingIds = new Set(similarNotes.map(note => note.noteId));

                    // Find children that aren't already in the similar notes
                    const missingChildIds = Array.from(childIds).filter(id => !existingIds.has(id));

                    // Add up to 3 children that weren't already included
                    for (const noteId of missingChildIds.slice(0, 3)) {
                        similarNotes.push({
                            noteId,
                            similarity: 0.75 // Fixed similarity score for context children
                        });
                    }
                }
            }
        }

        // Get note content for context
        return await Promise.all(similarNotes.map(async ({ noteId, similarity }) => {
            const note = becca.getNote(noteId);
            if (!note) {
                return {
                    noteId,
                    title: "Unknown Note",
                    similarity
                };
            }

            // Get note content
            let content = '';
            try {
                // @ts-ignore - Content can be string or Buffer
                const noteContent = await note.getContent();
                content = typeof noteContent === 'string' ? noteContent : noteContent.toString('utf8');

                // Truncate content if it's too long (for performance)
                if (content.length > 2000) {
                    content = content.substring(0, 2000) + "...";
                }
            } catch (e) {
                log.error(`Error getting content for note ${noteId}: ${e}`);
            }

            // Get a branch ID for navigation
            let branchId;
            try {
                const branches = note.getBranches();
                if (branches.length > 0) {
                    branchId = branches[0].branchId;
                }
            } catch (e) {
                log.error(`Error getting branch for note ${noteId}: ${e}`);
            }

            return {
                noteId,
                title: note.title,
                content,
                similarity,
                branchId
            };
        }));
    } catch (error) {
        log.error(`Error finding relevant notes: ${error}`);
        // Return empty array on error
        return [];
    }
}

/**
 * Build a context string from relevant notes
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
 * Send a message to an LLM chat session and get a response
 */
async function sendMessage(req: Request, res: Response) {
    try {
        const { sessionId, content, temperature, maxTokens, provider, model } = req.body;

        console.log("Received message request:", {
            sessionId,
            contentLength: content ? content.length : 0,
            contentPreview: content ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : 'undefined',
            temperature,
            maxTokens,
            provider,
            model
        });

        if (!sessionId) {
            throw new Error('Session ID is required');
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            throw new Error('Content cannot be empty');
        }

        // Check if streaming is requested
        const wantsStream = (req.headers as any)['accept']?.includes('text/event-stream');

        // If client wants streaming, set up SSE response
        if (wantsStream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Get chat session
            let session = sessions.get(sessionId);
            if (!session) {
                const newSession = await createSession(req, res);
                if (!newSession) {
                    throw new Error('Failed to create session');
                }
                // Add required properties to match ChatSession interface
                session = {
                    ...newSession,
                    messages: [],
                    lastActive: new Date(),
                    metadata: {}
                };
                sessions.set(sessionId, session);
            }

            // Add user message to session
            const userMessage: ChatMessage = {
                role: 'user',
                content: content,
                timestamp: new Date()
            };
            console.log("Created user message:", {
                role: userMessage.role,
                contentLength: userMessage.content?.length || 0,
                contentPreview: userMessage.content?.substring(0, 50) + (userMessage.content?.length > 50 ? '...' : '') || 'undefined'
            });
            session.messages.push(userMessage);

            // Get context for query
            const sources = await findRelevantNotes(content, session.noteContext || null);

            // Format messages for AI with proper type casting
            const aiMessages: Message[] = [
                { role: 'system', content: 'You are a helpful assistant for Trilium Notes. When providing answers, use only the context provided in the notes. If the information is not in the notes, say so.' },
                { role: 'user', content: buildContextFromNotes(sources, content) }
            ];

            // Ensure we're not sending empty content
            console.log("Final message content length:", aiMessages[1].content.length);
            console.log("Final message content preview:", aiMessages[1].content.substring(0, 100));

            try {
                // Send initial SSE message with session info
                const sourcesForResponse = sources.map(({ noteId, title, similarity, branchId }) => ({
                    noteId,
                    title,
                    similarity: similarity ? Math.round(similarity * 100) / 100 : undefined,
                    branchId
                }));

                res.write(`data: ${JSON.stringify({
                    type: 'init',
                    session: {
                        id: sessionId,
                        messages: session.messages.slice(0, -1), // Don't include the new message yet
                        sources: sourcesForResponse
                    }
                })}\n\n`);

                // Get AI response with streaming enabled
                const aiResponse = await aiServiceManagerModule.default.generateChatCompletion(aiMessages, {
                    temperature,
                    maxTokens,
                    model: provider ? `${provider}:${model}` : model,
                    stream: true
                });

                if (aiResponse.stream) {
                    // Create an empty assistant message
                    const assistantMessage: ChatMessage = {
                        role: 'assistant',
                        content: '',
                        timestamp: new Date()
                    };
                    session.messages.push(assistantMessage);

                    // Stream the response chunks
                    await aiResponse.stream(async (chunk) => {
                        if (chunk.text) {
                            // Update the message content
                            assistantMessage.content += chunk.text;

                            // Send chunk to client
                            res.write(`data: ${JSON.stringify({
                                type: 'chunk',
                                text: chunk.text,
                                done: chunk.done
                            })}\n\n`);
                        }

                        if (chunk.done) {
                            // Send final message with complete response
                            res.write(`data: ${JSON.stringify({
                                type: 'done',
                                session: {
                                    id: sessionId,
                                    messages: session.messages,
                                    sources: sourcesForResponse
                                }
                            })}\n\n`);

                            res.end();
                        }
                    });

                    return; // Early return for streaming
                } else {
                    // Fallback for non-streaming response
                    const assistantMessage: ChatMessage = {
                        role: 'assistant',
                        content: aiResponse.text,
                        timestamp: new Date()
                    };
                    session.messages.push(assistantMessage);

                    // Send complete response
                    res.write(`data: ${JSON.stringify({
                        type: 'done',
                        session: {
                            id: sessionId,
                            messages: session.messages,
                            sources: sourcesForResponse
                        }
                    })}\n\n`);

                    res.end();
                    return;
                }
            } catch (error: any) {
                // Send error in streaming format
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    error: `AI service error: ${error.message}`
                })}\n\n`);

                res.end();
                return;
            }
        }

        // Non-streaming API continues with normal JSON response...

        // Get chat session
        let session = sessions.get(sessionId);
        if (!session) {
            const newSession = await createSession(req, res);
            if (!newSession) {
                throw new Error('Failed to create session');
            }
            // Add required properties to match ChatSession interface
            session = {
                ...newSession,
                messages: [],
                lastActive: new Date(),
                metadata: {}
            };
            sessions.set(sessionId, session);
        }

        // Add user message to session
        const userMessage: ChatMessage = {
            role: 'user',
            content: content,
            timestamp: new Date()
        };
        console.log("Created user message:", {
            role: userMessage.role,
            contentLength: userMessage.content?.length || 0,
            contentPreview: userMessage.content?.substring(0, 50) + (userMessage.content?.length > 50 ? '...' : '') || 'undefined'
        });
        session.messages.push(userMessage);

        // Get context for query
        const sources = await findRelevantNotes(content, session.noteContext || null);

        // Format messages for AI with proper type casting
        const aiMessages: Message[] = [
            { role: 'system', content: 'You are a helpful assistant for Trilium Notes. When providing answers, use only the context provided in the notes. If the information is not in the notes, say so.' },
            { role: 'user', content: buildContextFromNotes(sources, content) }
        ];

        // Ensure we're not sending empty content
        console.log("Final message content length:", aiMessages[1].content.length);
        console.log("Final message content preview:", aiMessages[1].content.substring(0, 100));

        try {
            // Get AI response using the safe accessor methods
            const aiResponse = await aiServiceManagerModule.default.generateChatCompletion(aiMessages, {
                temperature,
                maxTokens,
                model: provider ? `${provider}:${model}` : model,
                stream: false
            });

            // Add assistant message to session
            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: aiResponse.text,
                timestamp: new Date()
            };
            session.messages.push(assistantMessage);

            // Format sources for the response (without content to reduce payload size)
            const sourcesForResponse = sources.map(({ noteId, title, similarity, branchId }) => ({
                noteId,
                title,
                similarity: similarity ? Math.round(similarity * 100) / 100 : undefined,
                branchId
            }));

            return {
                id: sessionId,
                messages: session.messages,
                sources: sourcesForResponse,
                provider: aiResponse.provider,
                model: aiResponse.model
            };
        } catch (error: any) {
            log.error(`AI service error: ${error.message}`);
            throw new Error(`AI service error: ${error.message}`);
        }
    } catch (error: any) {
        log.error(`Error sending message: ${error.message}`);
        throw error;
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
