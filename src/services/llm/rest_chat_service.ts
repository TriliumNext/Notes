import log from "../log.js";
import type { Request, Response } from "express";
import type { Message, ChatCompletionOptions } from "./ai_interface.js";
import contextService from "./context/services/context_service.js";
import { LLM_CONSTANTS } from './constants/provider_constants.js';
import { ERROR_PROMPTS } from './constants/llm_prompt_constants.js';
import becca from "../../becca/becca.js";
import vectorStore from "./embeddings/index.js";
import providerManager from "./providers/providers.js";
import options from "../../services/options.js";
import { randomString } from "../utils.js";
import type { LLMServiceInterface } from './interfaces/agent_tool_interfaces.js';
import { AIServiceManager } from "./ai_service_manager.js";
import { ChatPipeline } from "./pipeline/chat_pipeline.js";
import type { ChatPipelineInput } from "./pipeline/interfaces.js";

// Define interfaces for the REST API
export interface NoteSource {
    noteId: string;
    title: string;
    content?: string;
    similarity?: number;
    branchId?: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    lastActive: Date;
    noteContext?: string;
    metadata: Record<string, any>;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}

// In-memory storage for sessions
// In a production app, this should be stored in a database
const sessions = new Map<string, ChatSession>();

// Flag to track if cleanup timer has been initialized
let cleanupInitialized = false;

// For message formatting - simple implementation to avoid dependency
const formatMessages = {
    getFormatter(providerName: string) {
        return {
            formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[] {
                // Simple implementation that works for most providers
                const formattedMessages: Message[] = [];

                // Add system message if context or systemPrompt is provided
                if (context || systemPrompt) {
                    formattedMessages.push({
                        role: 'system',
                        content: systemPrompt || (context ? `Use the following context to answer the query: ${context}` : '')
                    });
                }

                // Add all other messages
                for (const message of messages) {
                    if (message.role === 'system' && formattedMessages.some(m => m.role === 'system')) {
                        // Skip duplicate system messages
                        continue;
                    }
                    formattedMessages.push(message);
                }

                return formattedMessages;
            }
        };
    }
};

/**
 * Service to handle chat API interactions
 */
class RestChatService {
    /**
     * Initialize the session cleanup timer to remove old/inactive sessions
     */
    initializeCleanupTimer(): void {
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
    isDatabaseInitialized(): boolean {
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
     * Find relevant notes based on search query
     */
    async findRelevantNotes(content: string, contextNoteId: string | null = null, limit = 5): Promise<NoteSource[]> {
        try {
            // If database is not initialized, we can't do this
            if (!this.isDatabaseInitialized()) {
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
                const contextNote = becca.notes[contextNoteId];
                if (!contextNote) {
                    return [];
                }

                const sql = require("../../services/sql.js").default;
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
     * Handle a message sent to an LLM and get a response
     */
    async handleSendMessage(req: Request, res: Response) {
        log.info("=== Starting handleSendMessage ===");
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

            // For GET requests, ensure we have the format=stream parameter
            if (req.method === 'GET' && (!req.query.format || req.query.format !== 'stream')) {
                throw new Error('Stream format parameter is required for GET requests');
            }

            // For POST requests, validate the content
            if (req.method === 'POST' && (!content || typeof content !== 'string' || content.trim().length === 0)) {
                throw new Error('Content cannot be empty');
            }

            // Check if session exists, create one if not
            let session: ChatSession;
            if (!sessionId || !sessions.has(sessionId)) {
                if (req.method === 'GET') {
                    // For GET requests, we must have an existing session
                    throw new Error('Session not found');
                }

                // For POST requests, we can create a new session automatically
                log.info(`Session ${sessionId} not found, creating a new one automatically`);
                const now = new Date();
                session = {
                    id: sessionId || randomString(16),
                    title: 'Auto-created Session',
                    messages: [],
                    createdAt: now,
                    lastActive: now,
                    metadata: {
                        temperature: 0.7,
                        maxTokens: undefined,
                        model: undefined,
                        provider: undefined
                    }
                };
                sessions.set(session.id, session);
                log.info(`Created new session with ID: ${session.id}`);
            } else {
                session = sessions.get(sessionId)!;
            }

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
            await this.ensureToolsInitialized();

            // Create and use the chat pipeline instead of direct processing
            const pipeline = new ChatPipeline({
                enableStreaming: req.method === 'GET',
                enableMetrics: true,
                maxToolCallIterations: 5
            });

            log.info("Executing chat pipeline...");

            // Prepare the pipeline input
            const pipelineInput: ChatPipelineInput = {
                messages: session.messages.map(msg => ({
                    role: msg.role as 'user' | 'assistant' | 'system',
                    content: msg.content
                })),
                query: content,
                noteId: session.noteContext ?? undefined,
                showThinking: showThinking,
                options: {
                    useAdvancedContext: useAdvancedContext,
                    systemPrompt: session.messages.find(m => m.role === 'system')?.content,
                    temperature: session.metadata.temperature,
                    maxTokens: session.metadata.maxTokens,
                    model: session.metadata.model,
                    // Set stream based on request type, but ensure it's explicitly a boolean value
                    // GET requests or format=stream parameter indicates streaming should be used
                    stream: !!(req.method === 'GET' || req.query.format === 'stream')
                },
                streamCallback: req.method === 'GET' ? (data, done, rawChunk) => {
                    // Prepare response data - include both the content and raw chunk data if available
                    const responseData: any = { content: data, done };
                    
                    // If there's tool execution information, add it to the response
                    if (rawChunk && rawChunk.toolExecution) {
                        responseData.toolExecution = rawChunk.toolExecution;
                    }
                    
                    // Send the data as a JSON event
                    res.write(`data: ${JSON.stringify(responseData)}\n\n`);
                    
                    if (done) {
                        res.end();
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

                // Return the response
                return {
                    content: response.text || '',
                    sources: (response as any).sources || []
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
     * Process a request with advanced context
     */
    private async processAdvancedContext(
        messageContent: string,
        session: ChatSession,
        service: any,
        isStreamingRequest: boolean,
        res: Response,
        showThinking: boolean
    ): Promise<NoteSource[]> {
        // Use the Trilium-specific approach
        const contextNoteId = session.noteContext || null;

        // Ensure tools are initialized to prevent tool execution issues
        await this.ensureToolsInitialized();

        // Log that we're calling contextService with the parameters
        log.info(`Using enhanced context with: noteId=${contextNoteId}, showThinking=${showThinking}`);

        // Correct parameters for contextService.processQuery
        const results = await contextService.processQuery(
            messageContent,
            service,
            {
                contextNoteId,
                showThinking
            }
        );

        // Get the generated context
        const context = results.context;
        // Convert from NoteSearchResult to NoteSource
        const sourceNotes = results.sources.map(source => ({
            noteId: source.noteId,
            title: source.title,
            content: source.content || undefined, // Convert null to undefined
            similarity: source.similarity
        }));

        // Format messages for the LLM using the proper context
        const aiMessages = await this.buildMessagesWithContext(
            session.messages.slice(-LLM_CONSTANTS.SESSION.MAX_SESSION_MESSAGES).map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            context,
            service
        );

        // DEBUG: Log message structure being sent to LLM
        log.info(`Message structure being sent to LLM: ${aiMessages.length} messages total`);

        // Configure chat options from session metadata
        const chatOptions: ChatCompletionOptions = {
            temperature: session.metadata.temperature || 0.7,
            maxTokens: session.metadata.maxTokens,
            model: session.metadata.model,
            stream: isStreamingRequest ? true : undefined,
            enableTools: true  // Explicitly enable tools
        };

        // Add a note indicating we're explicitly enabling tools
        log.info(`Advanced context flow: explicitly enabling tools in chat options`);

        // Process streaming responses differently
        if (isStreamingRequest) {
            // Handle streaming using the existing method
            await this.handleStreamingResponse(res, aiMessages, chatOptions, service, session);
        } else {
            // For non-streaming requests, generate a completion synchronously
            const response = await service.generateChatCompletion(aiMessages, chatOptions);

            // Check if the response contains tool calls
            if (response.tool_calls && response.tool_calls.length > 0) {
                log.info(`Advanced context non-streaming: detected ${response.tool_calls.length} tool calls in response`);
                log.info(`Tool calls details: ${JSON.stringify(response.tool_calls)}`);

                try {
                    let currentMessages = [...aiMessages];
                    let hasMoreToolCalls = true;
                    let iterationCount = 0;
                    const MAX_ITERATIONS = 3; // Prevent infinite loops

                    // Add initial assistant response with tool calls
                    currentMessages.push({
                        role: 'assistant',
                        content: response.text || '',
                        tool_calls: response.tool_calls
                    });

                    while (hasMoreToolCalls && iterationCount < MAX_ITERATIONS) {
                        iterationCount++;
                        log.info(`Tool iteration ${iterationCount}/${MAX_ITERATIONS}`);

                        // Execute the tools
                        const toolResults = await this.executeToolCalls(response);
                        log.info(`Successfully executed ${toolResults.length} tool calls in iteration ${iterationCount}`);

                        // Add tool results to messages
                        currentMessages = [...currentMessages, ...toolResults];

                        // Make a follow-up request with the tool results
                        log.info(`Making follow-up request with ${toolResults.length} tool results`);
                        const followUpOptions = {...chatOptions, enableTools: iterationCount < MAX_ITERATIONS}; // Enable tools for follow-up but limit iterations
                        const followUpResponse = await service.generateChatCompletion(currentMessages, followUpOptions);

                        // Check if the follow-up response has more tool calls
                        if (followUpResponse.tool_calls && followUpResponse.tool_calls.length > 0) {
                            log.info(`Follow-up response has ${followUpResponse.tool_calls.length} more tool calls`);

                            // Add this response to messages for next iteration
                            currentMessages.push({
                                role: 'assistant',
                                content: followUpResponse.text || '',
                                tool_calls: followUpResponse.tool_calls
                            });

                            // Update response for next iteration
                            response.tool_calls = followUpResponse.tool_calls;
                        } else {
                            // No more tool calls, add final response and break loop
                            log.info(`No more tool calls in follow-up response`);
                            hasMoreToolCalls = false;

                            // Update the session with the final response
                            session.messages.push({
                                role: 'assistant',
                                content: followUpResponse.text || '',
                                timestamp: new Date()
                            });
                        }
                    }

                    // If we reached the max iterations, add the last response
                    if (iterationCount >= MAX_ITERATIONS && hasMoreToolCalls) {
                        log.info(`Reached maximum tool iteration limit of ${MAX_ITERATIONS}`);

                        // Get the last response we received
                        const lastResponse = currentMessages
                            .filter(msg => msg.role === 'assistant')
                            .pop();

                        if (lastResponse) {
                            session.messages.push({
                                role: 'assistant',
                                content: lastResponse.content || '',
                                timestamp: new Date()
                            });
                        }
                    }
                } catch (toolError: any) {
                    log.error(`Error executing tools in advanced context: ${toolError.message}`);

                    // Add error response to session
                    session.messages.push({
                        role: 'assistant',
                        content: `Error executing tools: ${toolError.message}`,
                        timestamp: new Date()
                    });
                }
            } else {
                // No tool calls, just add the response to the session
                session.messages.push({
                    role: 'assistant',
                    content: response.text || '',
                    timestamp: new Date()
                });
            }
        }

        return sourceNotes;
    }

    /**
     * Process a request with standard context
     */
    private async processStandardContext(
        messageContent: string,
        session: ChatSession,
        service: any,
        isStreamingRequest: boolean,
        res: Response
    ): Promise<NoteSource[]> {
        // Original approach - find relevant notes through direct embedding comparison
        const relevantNotes = await this.findRelevantNotes(
            messageContent,
            session.noteContext || null,
            5
        );

        // Build context from relevant notes
        const context = this.buildContextFromNotes(relevantNotes, messageContent);

        // Get messages with context properly formatted for the specific LLM provider
        const aiMessages = await this.buildMessagesWithContext(
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
            await this.handleStreamingResponse(res, aiMessages, chatOptions, service, session);
        } else {
            // Non-streaming approach for POST requests
            const response = await service.generateChatCompletion(aiMessages, chatOptions);
            const aiResponse = response.text; // Extract the text from the response

            // Store the assistant's response in the session
            session.messages.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            });
        }

        return relevantNotes;
    }

    /**
     * Handle streaming response from LLM
     */
    private async handleStreamingResponse(
        res: Response,
        aiMessages: Message[],
        chatOptions: ChatCompletionOptions,
        service: any,
        session: ChatSession
    ) {
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

            // Check for tool calls in the response
            if (response.tool_calls && response.tool_calls.length > 0) {
                log.info(`========== STREAMING TOOL CALLS DETECTED ==========`);
                log.info(`Response contains ${response.tool_calls.length} tool calls, executing them...`);
                log.info(`CRITICAL CHECK: Tool execution is supposed to happen in the pipeline, not directly here.`);
                log.info(`If tools are being executed here instead of in the pipeline, this may be a flow issue.`);
                log.info(`Response came from provider: ${response.provider || 'unknown'}, model: ${response.model || 'unknown'}`);

                try {
                    log.info(`========== STREAMING TOOL EXECUTION PATH ==========`);
                    log.info(`About to execute tools in streaming path (this is separate from pipeline tool execution)`);

                    // Execute the tools
                    const toolResults = await this.executeToolCalls(response);
                    log.info(`Successfully executed ${toolResults.length} tool calls in streaming path`);

                    // Make a follow-up request with the tool results
                    const toolMessages = [...aiMessages, {
                        role: 'assistant',
                        content: response.text || '',
                        tool_calls: response.tool_calls
                    }, ...toolResults];

                    log.info(`Making follow-up request with ${toolResults.length} tool results`);

                    // Send partial response to let the client know tools are being processed
                    if (!res.writableEnded) {
                        res.write(`data: ${JSON.stringify({ content: "Processing tools... " })}\n\n`);
                    }

                    // Use non-streaming for the follow-up to get a complete response
                    const followUpOptions = {...chatOptions, stream: false, enableTools: false}; // Prevent infinite loops
                    const followUpResponse = await service.generateChatCompletion(toolMessages, followUpOptions);

                    messageContent = followUpResponse.text || "";

                    // Send the complete response as a single chunk
                    if (!res.writableEnded) {
                        res.write(`data: ${JSON.stringify({ content: messageContent })}\n\n`);
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }

                    // Store the full response for the session
                    session.messages.push({
                        role: 'assistant',
                        content: messageContent,
                        timestamp: new Date()
                    });

                    return; // Skip the rest of the processing
                } catch (toolError) {
                    log.error(`Error executing tools: ${toolError}`);
                    // Continue with normal streaming response as fallback
                }
            }

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
            const aiResponse = messageContent;

            // Store the assistant's response in the session
            session.messages.push({
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            });
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
            }
        }
    }

    /**
     * Execute tool calls from the LLM response
     * @param response The LLM response containing tool calls
     */
    private async executeToolCalls(response: any): Promise<Message[]> {
        log.info(`========== REST SERVICE TOOL EXECUTION FLOW ==========`);
        log.info(`Entered executeToolCalls method in REST chat service`);

        if (!response.tool_calls || response.tool_calls.length === 0) {
            log.info(`No tool calls to execute, returning early`);
            return [];
        }

        log.info(`Executing ${response.tool_calls.length} tool calls from REST chat service`);

        // Import tool registry directly to avoid circular dependencies
        const toolRegistry = (await import('./tools/tool_registry.js')).default;

        // Check if tools are available
        const availableTools = toolRegistry.getAllTools();
        log.info(`Available tools in registry: ${availableTools.length}`);

        if (availableTools.length === 0) {
            log.error('No tools available in registry for execution');

            // Try to initialize tools
            try {
                const toolInitializer = await import('./tools/tool_initializer.js');
                await toolInitializer.default.initializeTools();
                const tools = toolRegistry.getAllTools();
                log.info(`Successfully registered ${tools.length} LLM tools: ${tools.map(t => t.definition.function.name).join(', ')}`);
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log.error(`Failed to initialize tools: ${errorMessage}`);
                throw new Error('Tool execution failed: No tools available');
            }
        }

        // Execute each tool call and collect results
        const toolResults = await Promise.all(response.tool_calls.map(async (toolCall: any) => {
            try {
                log.info(`Executing tool: ${toolCall.function.name}, ID: ${toolCall.id || 'unknown'}`);

                // Get the tool from registry
                const tool = toolRegistry.getTool(toolCall.function.name);
                if (!tool) {
                    throw new Error(`Tool not found: ${toolCall.function.name}`);
                }

                // Parse arguments
                let args;
                if (typeof toolCall.function.arguments === 'string') {
                    try {
                        args = JSON.parse(toolCall.function.arguments);
                    } catch (e: unknown) {
                        log.error(`Failed to parse tool arguments: ${e instanceof Error ? e.message : String(e)}`);

                        // Try cleanup and retry
                        try {
                            const cleaned = toolCall.function.arguments
                                .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
                                .replace(/\\"/g, '"')        // Replace escaped quotes
                                .replace(/([{,])\s*'([^']+)'\s*:/g, '$1"$2":') // Replace single quotes around property names
                                .replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":');    // Add quotes around unquoted property names

                            args = JSON.parse(cleaned);
                        } catch (cleanErr) {
                            // If all parsing fails, use as-is
                            args = { text: toolCall.function.arguments };
                        }
                    }
                } else {
                    args = toolCall.function.arguments;
                }

                // Log what we're about to execute
                log.info(`Executing tool with arguments: ${JSON.stringify(args)}`);

                // Execute the tool and get result
                const startTime = Date.now();
                const result = await tool.execute(args);
                const executionTime = Date.now() - startTime;

                log.info(`Tool execution completed in ${executionTime}ms`);

                // Log the result
                const resultPreview = typeof result === 'string'
                    ? result.substring(0, 100) + (result.length > 100 ? '...' : '')
                    : JSON.stringify(result).substring(0, 100) + '...';
                log.info(`Tool result: ${resultPreview}`);

                // Format result as a proper message
                return {
                    role: 'tool',
                    content: typeof result === 'string' ? result : JSON.stringify(result),
                    name: toolCall.function.name,
                    tool_call_id: toolCall.id || `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
                };
            } catch (error: any) {
                log.error(`Error executing tool ${toolCall.function.name}: ${error.message}`);

                // Return error as tool result
                return {
                    role: 'tool',
                    content: `Error: ${error.message}`,
                    name: toolCall.function.name,
                    tool_call_id: toolCall.id || `tool-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
                };
            }
        }));

        log.info(`Completed execution of ${toolResults.length} tools`);
        return toolResults;
    }

    /**
     * Build context from relevant notes
     */
    buildContextFromNotes(sources: NoteSource[], query: string): string {
        if (!sources || sources.length === 0) {
            return query || '';
        }

        const noteContexts = sources
            .filter(source => source.content) // Only include sources with content
            .map((source) => {
                // Format each note with its title as a natural heading and wrap in <note> tags
                return `<note>\n### ${source.title}\n${source.content || 'No content available'}\n</note>`;
            })
            .join('\n\n');

        if (!noteContexts) {
            return query || '';
        }

        // Import the CONTEXT_PROMPTS constant
        const { CONTEXT_PROMPTS } = require('./constants/llm_prompt_constants.js');

        // Use the template from the constants file, replacing placeholders
        return CONTEXT_PROMPTS.CONTEXT_NOTES_WRAPPER
            .replace('{noteContexts}', noteContexts)
            .replace('{query}', query);
    }

    /**
     * Get all sessions
     */
    getSessions() {
        return sessions;
    }

    /**
     * Create a new chat session
     */
    async createSession(req: Request, res: Response) {
        try {
            // Initialize cleanup if not already done
            this.initializeCleanupTimer();

            const options: any = req.body || {};
            const title = options.title || 'Chat Session';

            const sessionId = randomString(16);
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
     * Get a specific chat session by ID
     */
    async getSession(req: Request, res: Response) {
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
     * Update a chat session's settings
     */
    async updateSession(req: Request, res: Response) {
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
     * List all chat sessions
     */
    async listSessions(req: Request, res: Response) {
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
     * Delete a chat session
     */
    async deleteSession(req: Request, res: Response) {
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
     * Ensure LLM tools are initialized
     */
    private async ensureToolsInitialized() {
        try {
            log.info("Initializing LLM tools...");

            // Import tool initializer and registry
            const toolInitializer = (await import('./tools/tool_initializer.js')).default;
            const toolRegistry = (await import('./tools/tool_registry.js')).default;

            // Check if tools are already initialized
            const registeredTools = toolRegistry.getAllTools();

            if (registeredTools.length === 0) {
                // Initialize tools if none are registered
                await toolInitializer.initializeTools();
                const tools = toolRegistry.getAllTools();
                log.info(`Successfully registered ${tools.length} LLM tools: ${tools.map(t => t.definition.function.name).join(', ')}`);
            } else {
                log.info(`LLM tools already initialized: ${registeredTools.length} tools available`);
            }

            // Get all available tools for logging
            const availableTools = toolRegistry.getAllTools().map(t => t.definition.function.name);
            log.info(`Available tools: ${availableTools.join(', ')}`);

            log.info("LLM tools initialized successfully: " + availableTools.length + " tools available");
            return true;
        } catch (error) {
            log.error(`Failed to initialize LLM tools: ${error}`);
            return false;
        }
    }

    // Function to build messages with context
    private async buildMessagesWithContext(
        messages: Message[],
        context: string,
        llmService: LLMServiceInterface
    ): Promise<Message[]> {
        try {
            if (!messages || messages.length === 0) {
                log.info('No messages provided to buildMessagesWithContext');
                return [];
            }

            if (!context || context.trim() === '') {
                log.info('No context provided to buildMessagesWithContext, returning original messages');
                return messages;
            }

            // Get the provider name, handling service classes and raw provider names
            let providerName: string;
            if (typeof llmService === 'string') {
                // If llmService is a string, assume it's the provider name
                providerName = llmService;
            } else if (llmService.constructor && llmService.constructor.name) {
                // Extract provider name from service class name (e.g., OllamaService -> ollama)
                providerName = llmService.constructor.name.replace('Service', '').toLowerCase();
            } else {
                // Fallback to default
                providerName = 'default';
            }

            log.info(`Using formatter for provider: ${providerName}`);

            // Get the appropriate formatter for this provider
            const formatter = formatMessages.getFormatter(providerName);

            // Format messages with context using the provider-specific formatter
            const formattedMessages = formatter.formatMessages(
                messages,
                undefined, // No system prompt override - use what's in the messages
                context
            );

            log.info(`Formatted ${messages.length} messages into ${formattedMessages.length} messages for ${providerName}`);

            return formattedMessages;
        } catch (error) {
            log.error(`Error building messages with context: ${error}`);
            // Fallback to original messages in case of error
            return messages;
        }
    }
}

// Create singleton instance
const restChatService = new RestChatService();
export default restChatService;
