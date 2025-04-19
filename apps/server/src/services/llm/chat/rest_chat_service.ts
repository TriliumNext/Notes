/**
 * Service to handle chat API interactions
 */
import log from "../../log.js";
import type { Request, Response } from "express";
import type { Message, ChatCompletionOptions } from "../ai_interface.js";
import { AIServiceManager } from "../ai_service_manager.js";
import { ChatPipeline } from "../pipeline/chat_pipeline.js";
import type { ChatPipelineInput } from "../pipeline/interfaces.js";
import options from "../../options.js";
import { SEARCH_CONSTANTS } from '../constants/search_constants.js';

// Import our refactored modules
import { ContextHandler } from "./handlers/context_handler.js";
import { ToolHandler } from "./handlers/tool_handler.js";
import { StreamHandler } from "./handlers/stream_handler.js";
import SessionsStore from "./sessions_store.js";
import * as MessageFormatter from "./utils/message_formatter.js";
import type { NoteSource } from "../interfaces/chat_session.js";
import type { LLMStreamMessage } from "../interfaces/chat_ws_messages.js";
import type { ChatMessage } from '../interfaces/chat_session.js';
import type { ChatSession } from '../interfaces/chat_session.js';

/**
 * Service to handle chat API interactions
 */
class RestChatService {
    /**
     * Check if the database is initialized
     */
    isDatabaseInitialized(): boolean {
        try {
            options.getOption('initialized');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if AI services are available
     */
    safelyUseAIManager(): boolean {
        // Only use AI manager if database is initialized
        if (!this.isDatabaseInitialized()) {
            log.info("AI check failed: Database is not initialized");
            return false;
        }

        // Try to access the manager - will create instance only if needed
        try {
            // Create local instance to avoid circular references
            const aiManager = new AIServiceManager();

            if (!aiManager) {
                log.info("AI check failed: AI manager module is not available");
                return false;
            }

            const isAvailable = aiManager.isAnyServiceAvailable();
            log.info(`AI service availability check result: ${isAvailable}`);

            if (isAvailable) {
                // Additional diagnostics
                try {
                    const providers = aiManager.getAvailableProviders();
                    log.info(`Available AI providers: ${providers.join(', ')}`);
                } catch (err) {
                    log.info(`Could not get available providers: ${err}`);
                }
            }

            return isAvailable;
        } catch (error) {
            log.error(`Error accessing AI service manager: ${error}`);
            return false;
        }
    }

    /**
     * Handle a message sent to an LLM and get a response
     */
    async handleSendMessage(req: Request, res: Response) {
        log.info("=== Starting handleSendMessage ===");
        try {
            // Extract parameters differently based on the request method
            let content, useAdvancedContext, showThinking, chatNoteId;

            if (req.method === 'POST') {
                // For POST requests, get content from the request body
                const requestBody = req.body || {};
                content = requestBody.content;
                useAdvancedContext = requestBody.useAdvancedContext || false;
                showThinking = requestBody.showThinking || false;

                // Add logging for POST requests
                log.info(`LLM POST message: chatNoteId=${req.params.chatNoteId}, useAdvancedContext=${useAdvancedContext}, showThinking=${showThinking}, contentLength=${content ? content.length : 0}`);
            } else if (req.method === 'GET') {
                // For GET (streaming) requests, get parameters from query params and body
                // For streaming requests, we need the content from the body
                useAdvancedContext = req.query.useAdvancedContext === 'true' || (req.body && req.body.useAdvancedContext === true);
                showThinking = req.query.showThinking === 'true' || (req.body && req.body.showThinking === true);
                content = req.body && req.body.content ? req.body.content : '';

                // Add detailed logging for GET requests
                log.info(`LLM GET stream: chatNoteId=${req.params.chatNoteId}, useAdvancedContext=${useAdvancedContext}, showThinking=${showThinking}`);
                log.info(`Parameters from query: useAdvancedContext=${req.query.useAdvancedContext}, showThinking=${req.query.showThinking}`);
                log.info(`Parameters from body: useAdvancedContext=${req.body?.useAdvancedContext}, showThinking=${req.body?.showThinking}, content=${content ? `${content.substring(0, 20)}...` : 'none'}`);
            }

            // Get chatNoteId from URL params
            chatNoteId = req.params.chatNoteId;

            // For GET requests, ensure we have the stream parameter
            if (req.method === 'GET' && req.query.stream !== 'true') {
                throw new Error('Stream parameter must be set to true for GET/streaming requests');
            }

            // For POST requests, validate the content
            if (req.method === 'POST' && (!content || typeof content !== 'string' || content.trim().length === 0)) {
                throw new Error('Content cannot be empty');
            }

            // Get or create session from Chat Note
            let session = await this.getOrCreateSessionFromChatNote(chatNoteId, req.method === 'POST');

            // If no session found and we're not allowed to create one (GET request)
            if (!session && req.method === 'GET') {
                throw new Error('Chat Note not found, cannot create session for streaming');
            }

            // For POST requests, if no Chat Note exists, create a new one
            if (!session && req.method === 'POST') {
                log.info(`No Chat Note found for ${chatNoteId}, creating a new Chat Note and session`);

                // Create a new Chat Note via the storage service
                //const chatStorageService = (await import('../../llm/chat_storage_service.js')).default;
                //const newChat = await chatStorageService.createChat('New Chat');

                // Use the new Chat Note's ID for the session
                session = SessionsStore.createSession({
                    //title: newChat.title,
                    chatNoteId: chatNoteId
                });

                // Update the session ID to match the Chat Note ID
                session.id = chatNoteId;

                log.info(`Created new Chat Note and session with ID: ${session.id}`);

                // Update the parameter to use the new ID
                chatNoteId = session.id;
            }

            // At this point, session should never be null
            // TypeScript doesn't know this, so we'll add a check
            if (!session) {
                // This should never happen due to our logic above
                throw new Error('Failed to create or retrieve session');
            }

            // Update session last active timestamp
            SessionsStore.touchSession(session.id);

            // For POST requests, store the user message
            if (req.method === 'POST' && content && session) {
                // Add message to session
                session.messages.push({
                    role: 'user',
                    content,
                    timestamp: new Date()
                });

                // Log a preview of the message
                log.info(`Processing LLM message: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
            }

            // Check if AI services are enabled before proceeding
            const aiEnabled = await options.getOptionBool('aiEnabled');
            log.info(`AI enabled setting: ${aiEnabled}`);
            if (!aiEnabled) {
                log.info("AI services are disabled by configuration");
                return {
                    error: "AI features are disabled. Please enable them in the settings."
                };
            }

            // Check if AI services are available
            log.info("Checking if AI services are available...");
            if (!this.safelyUseAIManager()) {
                log.info("AI services are not available - checking for specific issues");

                try {
                    // Create a direct instance to avoid circular references
                    const aiManager = new AIServiceManager();

                    if (!aiManager) {
                        log.error("AI service manager is not initialized");
                        return {
                            error: "AI service is not properly initialized. Please check your configuration."
                        };
                    }

                    const availableProviders = aiManager.getAvailableProviders();
                    if (availableProviders.length === 0) {
                        log.error("No AI providers are available");
                        return {
                            error: "No AI providers are configured or available. Please check your AI settings."
                        };
                    }
                } catch (err) {
                    log.error(`Detailed AI service check failed: ${err}`);
                }

                return {
                    error: "AI services are currently unavailable. Please check your configuration."
                };
            }

            // Create direct instance to avoid circular references
            const aiManager = new AIServiceManager();

            // Get the default service - just use the first available one
            const availableProviders = aiManager.getAvailableProviders();

            if (availableProviders.length === 0) {
                log.error("No AI providers are available after manager check");
                return {
                    error: "No AI providers are configured or available. Please check your AI settings."
                };
            }

            // Use the first available provider
            const providerName = availableProviders[0];
            log.info(`Using AI provider: ${providerName}`);

            // We know the manager has a 'services' property from our code inspection,
            // but TypeScript doesn't know that from the interface.
            // This is a workaround to access it
            const service = (aiManager as any).services[providerName];

            if (!service) {
                log.error(`AI service for provider ${providerName} not found`);
                return {
                    error: `Selected AI provider (${providerName}) is not available. Please check your configuration.`
                };
            }

            // Initialize tools
            log.info("Initializing LLM agent tools...");
            // Ensure tools are initialized to prevent tool execution issues
            await ToolHandler.ensureToolsInitialized();

            // Create and use the chat pipeline instead of direct processing
            const pipeline = new ChatPipeline({
                enableStreaming: req.method === 'GET',
                enableMetrics: true,
                maxToolCallIterations: 5
            });

            log.info("Executing chat pipeline...");

            // Create options object for better tracking
            const pipelineOptions = {
                // Force useAdvancedContext to be a boolean, no matter what
                useAdvancedContext: useAdvancedContext === true,
                systemPrompt: session?.messages.find(m => m.role === 'system')?.content,
                temperature: session?.metadata.temperature,
                maxTokens: session?.metadata.maxTokens,
                model: session?.metadata.model,
                // Set stream based on request type, but ensure it's explicitly a boolean value
                // GET requests or format=stream parameter indicates streaming should be used
                stream: !!(req.method === 'GET' || req.query.format === 'stream' || req.query.stream === 'true'),
                // Include chatNoteId for tracking tool executions
                chatNoteId: chatNoteId
            };

            // Log the options to verify what's being sent to the pipeline
            log.info(`Pipeline input options: ${JSON.stringify({
                useAdvancedContext: pipelineOptions.useAdvancedContext,
                stream: pipelineOptions.stream
            })}`);

            // Import the WebSocket service for direct access
            const wsService = await import('../../ws.js');

            // Create a stream callback wrapper
            // This will ensure we properly handle all streaming messages
            let messageContent = '';

            // Prepare the pipeline input
            const pipelineInput: ChatPipelineInput = {
                messages: session.messages.map(msg => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content
                })),
                query: content || '',  // Ensure query is always a string, even if content is null/undefined
                noteId: session.noteContext ?? undefined,
                showThinking: showThinking,
                options: pipelineOptions,
                streamCallback: req.method === 'GET' ? (data, done, rawChunk) => {
                    try {
                        // Use WebSocket service to send messages
                        this.handleStreamCallback(
                            data, done, rawChunk,
                            wsService.default, chatNoteId,
                            messageContent, session, res
                        );
                    } catch (error) {
                        log.error(`Error in stream callback: ${error}`);

                        // Try to send error message
                        try {
                            wsService.default.sendMessageToAllClients({
                                type: 'llm-stream',
                                chatNoteId: chatNoteId,
                                error: `Stream error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                done: true
                            });

                            // End the response
                            res.write(`data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`);
                            res.end();
                        } catch (e) {
                            log.error(`Failed to send error message: ${e}`);
                        }
                    }
                } : undefined
            };

            // Execute the pipeline
            const response = await pipeline.execute(pipelineInput);

            // Handle the response
            if (req.method === 'POST') {
                // Add assistant message to session
                session.messages.push({
                    role: 'assistant',
                    content: response.text || '',
                    timestamp: new Date()
                });

                // Extract sources if they're available
                const sources = (response as any).sources || [];

                // Store sources in the session metadata if they're present
                if (sources.length > 0) {
                    session.metadata.sources = sources;
                    log.info(`Stored ${sources.length} sources in session metadata`);
                }

                // Return the response with complete metadata
                return {
                    content: response.text || '',
                    sources: sources,
                    metadata: {
                        model: response.model || session.metadata.model,
                        provider: response.provider || session.metadata.provider,
                        temperature: session.metadata.temperature,
                        maxTokens: session.metadata.maxTokens,
                        lastUpdated: new Date().toISOString(),
                        toolExecutions: session.metadata.toolExecutions || []
                    }
                };
            } else {
                // For streaming requests, we've already sent the response
                return null;
            }
        } catch (processingError: any) {
            log.error(`Error processing message: ${processingError}`);
            return {
                error: `Error processing your request: ${processingError.message}`
            };
        }
    }

    /**
     * Handle stream callback for WebSocket communication
     */
    private handleStreamCallback(
        data: string | null,
        done: boolean,
        rawChunk: any,
        wsService: any,
        chatNoteId: string,
        messageContent: string,
        session: any,
        res: Response
    ) {
        // Only accumulate content that's actually text (not tool execution or thinking info)
        if (data) {
            messageContent += data;
        }

        // Create a message object with all necessary fields
        const message: LLMStreamMessage = {
            type: 'llm-stream',
            chatNoteId: chatNoteId
        };

        // Add content if available - either the new chunk or full content on completion
        if (data) {
            message.content = data;
        }

        // Add thinking info if available in the raw chunk
        if (rawChunk && 'thinking' in rawChunk && rawChunk.thinking) {
            message.thinking = rawChunk.thinking as string;
        }

        // Add tool execution info if available in the raw chunk
        if (rawChunk && 'toolExecution' in rawChunk && rawChunk.toolExecution) {
            // Transform the toolExecution to match the expected format
            const toolExec = rawChunk.toolExecution;
            message.toolExecution = {
                // Use optional chaining for all properties
                tool: typeof toolExec.tool === 'string'
                    ? toolExec.tool
                    : toolExec.tool?.name,
                result: toolExec.result,
                // Map arguments to args
                args: 'arguments' in toolExec ?
                    (typeof toolExec.arguments === 'object' ?
                        toolExec.arguments as Record<string, unknown> : {}) : {},
                // Add additional properties if they exist
                action: 'action' in toolExec ? toolExec.action as string : undefined,
                toolCallId: 'toolCallId' in toolExec ? toolExec.toolCallId as string : undefined,
                error: 'error' in toolExec ? toolExec.error as string : undefined
            };
        }

        // Set done flag explicitly
        message.done = done;

        // On final message, include the complete content too
        if (done) {
            // Store the response in the session when done
            session.messages.push({
                role: 'assistant',
                content: messageContent,
                timestamp: new Date()
            });
        }

        // Send message to all clients
        wsService.sendMessageToAllClients(message);

        // Log what was sent (first message and completion)
        if (message.thinking || done) {
            log.info(
                `[WS-SERVER] Sending LLM stream message: chatNoteId=${chatNoteId}, content=${!!message.content}, contentLength=${message.content?.length || 0}, thinking=${!!message.thinking}, toolExecution=${!!message.toolExecution}, done=${done}`
            );
        }

        // For GET requests, also send as server-sent events
        // Prepare response data for JSON event
        const responseData: any = {
            content: data,
            done
        };

        // Add tool execution if available
        if (rawChunk?.toolExecution) {
            responseData.toolExecution = rawChunk.toolExecution;
        }

        // Send the data as a JSON event
        res.write(`data: ${JSON.stringify(responseData)}\n\n`);

        if (done) {
            res.end();
        }
    }

    /**
     * Create a new chat session
     */
    async createSession(req: Request, res: Response) {
        try {
            const options: any = req.body || {};
            const title = options.title || 'Chat Session';

            // Use the currentNoteId as the chatNoteId if provided
            let chatNoteId = options.chatNoteId;

            // If currentNoteId is provided but chatNoteId is not, use currentNoteId
            if (!chatNoteId && options.currentNoteId) {
                chatNoteId = options.currentNoteId;
                log.info(`Using provided currentNoteId ${chatNoteId} as chatNoteId`);
            }

            // If we still don't have a chatNoteId, create a new Chat Note
            if (!chatNoteId) {
                // Create a new Chat Note via the storage service
                const chatStorageService = (await import('../../llm/chat_storage_service.js')).default;
                const newChat = await chatStorageService.createChat(title);
                chatNoteId = newChat.id;
                log.info(`Created new Chat Note with ID: ${chatNoteId}`);
            }

            // Create a new session through our session store
            const session = SessionsStore.createSession({
                chatNoteId,
                title,
                systemPrompt: options.systemPrompt,
                contextNoteId: options.contextNoteId,
                maxTokens: options.maxTokens,
                model: options.model,
                provider: options.provider,
                temperature: options.temperature
            });

            return {
                id: session.id,
                title: session.title,
                createdAt: session.createdAt,
                noteId: chatNoteId // Return the note ID explicitly
            };
        } catch (error: any) {
            log.error(`Error creating LLM session: ${error.message || 'Unknown error'}`);
            throw new Error(`Failed to create LLM session: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Get a specific chat session by ID
     */
    async getSession(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;

            // Check if session exists
            const session = SessionsStore.getSession(sessionId);
            if (!session) {
                // Instead of throwing an error, return a structured 404 response
                // that the frontend can handle gracefully
                res.status(404).json({
                    error: true,
                    message: `Session with ID ${sessionId} not found`,
                    code: 'session_not_found',
                    sessionId
                });
                return null; // Return null to prevent further processing
            }

            // Return session with metadata and additional fields
            return {
                id: session.id,
                title: session.title,
                createdAt: session.createdAt,
                lastActive: session.lastActive,
                messages: session.messages,
                noteContext: session.noteContext,
                // Include additional fields for the frontend
                sources: session.metadata.sources || [],
                metadata: {
                    model: session.metadata.model,
                    provider: session.metadata.provider,
                    temperature: session.metadata.temperature,
                    maxTokens: session.metadata.maxTokens,
                    lastUpdated: session.lastActive.toISOString(),
                    // Include simplified tool executions if available
                    toolExecutions: session.metadata.toolExecutions || []
                }
            };
        } catch (error: any) {
            log.error(`Error getting LLM session: ${error.message || 'Unknown error'}`);
            throw new Error(`Failed to get session: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Delete a chat session
     */
    async deleteSession(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;

            // Delete the session
            const success = SessionsStore.deleteSession(sessionId);
            if (!success) {
                throw new Error(`Session with ID ${sessionId} not found`);
            }

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
     * Get all sessions
     */
    getSessions() {
        return SessionsStore.getAllSessions();
    }

    /**
     * Create an in-memory session from a Chat Note
     * This treats the Chat Note as the source of truth, using its ID as the session ID
     */
    async createSessionFromChatNote(noteId: string): Promise<ChatSession | null> {
        try {
            log.info(`Creating in-memory session for Chat Note ID ${noteId}`);

            // Import chat storage service
            const chatStorageService = (await import('../../llm/chat_storage_service.js')).default;

            // Try to get the Chat Note data
            const chatNote = await chatStorageService.getChat(noteId);

            if (!chatNote) {
                log.error(`Chat Note ${noteId} not found, cannot create session`);
                return null;
            }

            log.info(`Found Chat Note ${noteId}, creating in-memory session`);

            // Convert Message[] to ChatMessage[] by ensuring the role is compatible
            const chatMessages: ChatMessage[] = chatNote.messages.map(msg => ({
                role: msg.role === 'tool' ? 'assistant' : msg.role, // Map 'tool' role to 'assistant'
                content: msg.content,
                timestamp: new Date()
            }));

            // Create a new session with the same ID as the Chat Note
            const session: ChatSession = {
                id: chatNote.id,  // Use Chat Note ID as the session ID
                title: chatNote.title,
                messages: chatMessages,
                createdAt: chatNote.createdAt || new Date(),
                lastActive: new Date(),
                metadata: chatNote.metadata || {}
            };

            // Add the session to the in-memory store
            SessionsStore.getAllSessions().set(noteId, session);

            log.info(`Successfully created in-memory session for Chat Note ${noteId}`);
            return session;
        } catch (error) {
            log.error(`Failed to create session from Chat Note: ${error}`);
            return null;
        }
    }

    /**
     * Get an existing session or create a new one from a Chat Note
     * This treats the Chat Note as the source of truth, using its ID as the session ID
     */
    async getOrCreateSessionFromChatNote(noteId: string, createIfNotFound: boolean = true): Promise<ChatSession | null> {
        // First check if we already have this session in memory
        let session = SessionsStore.getSession(noteId);

        if (session) {
            log.info(`Found existing in-memory session for Chat Note ${noteId}`);
            return session;
        }

        // If not in memory, try to create from Chat Note
        log.info(`Session not found in memory for Chat Note ${noteId}, attempting to create it`);

        // Only try to create if allowed
        if (!createIfNotFound) {
            log.info(`Not creating new session for ${noteId} as createIfNotFound=false`);
            return null;
        }

        // Create from Chat Note
        return await this.createSessionFromChatNote(noteId);
    }
}

// Create singleton instance
const restChatService = new RestChatService();
export default restChatService;
