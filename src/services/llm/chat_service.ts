import type { Message, ChatCompletionOptions, ChatResponse } from './ai_interface.js';
import chatStorageService from './chat_storage_service.js';
import log from '../log.js';
import { CONTEXT_PROMPTS, ERROR_PROMPTS } from './constants/llm_prompt_constants.js';
import { ChatPipeline } from './pipeline/chat_pipeline.js';
import type { ChatPipelineConfig, StreamCallback } from './pipeline/interfaces.js';
import aiServiceManager from './ai_service_manager.js';
import type { ChatPipelineInput } from './pipeline/interfaces.js';

// Update the ChatCompletionOptions interface to include the missing properties
// TODO fix
declare module './ai_interface.js' {
    interface ChatCompletionOptions {
        pipeline?: string;
        noteId?: string;
        useAdvancedContext?: boolean;
    }
}

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    isStreaming?: boolean;
    options?: ChatCompletionOptions;
}

/**
 * Chat pipeline configurations for different use cases
 */
const PIPELINE_CONFIGS: Record<string, Partial<ChatPipelineConfig>> = {
    default: {
        enableStreaming: true,
        enableMetrics: true
    },
    agent: {
        enableStreaming: true,
        enableMetrics: true,
        maxToolCallIterations: 5
    },
    performance: {
        enableStreaming: false,
        enableMetrics: true
    }
};

/**
 * Service for managing chat interactions and history
 */
export class ChatService {
    private activeSessions: Map<string, ChatSession> = new Map();
    private pipelines: Map<string, ChatPipeline> = new Map();

    constructor() {
        // Initialize pipelines
        Object.entries(PIPELINE_CONFIGS).forEach(([name, config]) => {
            this.pipelines.set(name, new ChatPipeline(config));
        });
    }

    /**
     * Get a pipeline by name, or the default one
     */
    private getPipeline(name: string = 'default'): ChatPipeline {
        return this.pipelines.get(name) || this.pipelines.get('default')!;
    }

    /**
     * Create a new chat session
     */
    async createSession(title?: string, initialMessages: Message[] = []): Promise<ChatSession> {
        const chat = await chatStorageService.createChat(title || 'New Chat', initialMessages);

        const session: ChatSession = {
            id: chat.id,
            title: chat.title,
            messages: chat.messages,
            isStreaming: false
        };

        this.activeSessions.set(chat.id, session);
        return session;
    }

    /**
     * Get an existing session or create a new one
     */
    async getOrCreateSession(sessionId?: string): Promise<ChatSession> {
        if (sessionId) {
            const existingSession = this.activeSessions.get(sessionId);
            if (existingSession) {
                return existingSession;
            }

            const chat = await chatStorageService.getChat(sessionId);
            if (chat) {
                const session: ChatSession = {
                    id: chat.id,
                    title: chat.title,
                    messages: chat.messages,
                    isStreaming: false
                };

                this.activeSessions.set(chat.id, session);
                return session;
            }
        }

        return this.createSession();
    }

    /**
     * Send a message in a chat session and get the AI response
     */
    async sendMessage(
        sessionId: string,
        content: string,
        options?: ChatCompletionOptions,
        streamCallback?: StreamCallback
    ): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content
        };

        session.messages.push(userMessage);
        session.isStreaming = true;

        try {
            // Immediately save the user message
            await chatStorageService.updateChat(session.id, session.messages);

            // Log message processing
            log.info(`Processing message: "${content.substring(0, 100)}..."`);

            // Select pipeline to use
            const pipeline = this.getPipeline();

            // Execute the pipeline
            const response = await pipeline.execute({
                messages: session.messages,
                options: options || session.options || {},
                query: content,
                streamCallback
            });

            // Add assistant message
            const assistantMessage: Message = {
                role: 'assistant',
                content: response.text
            };

            session.messages.push(assistantMessage);
            session.isStreaming = false;

            // Save the complete conversation
            await chatStorageService.updateChat(session.id, session.messages);

            // If first message, update the title based on content
            if (session.messages.length <= 2 && (!session.title || session.title === 'New Chat')) {
                const title = this.generateTitleFromMessages(session.messages);
                session.title = title;
                await chatStorageService.updateChat(session.id, session.messages, title);
            }

            return session;

        } catch (error: any) {
            session.isStreaming = false;
            console.error('Error in AI chat:', error);

            // Add error message
            const errorMessage: Message = {
                role: 'assistant',
                content: ERROR_PROMPTS.USER_ERRORS.GENERAL_ERROR
            };

            session.messages.push(errorMessage);

            // Save the conversation with error
            await chatStorageService.updateChat(session.id, session.messages);

            // Notify streaming error if callback provided
            if (streamCallback) {
                streamCallback(errorMessage.content, true);
            }

            return session;
        }
    }

    /**
     * Send a message with context from a specific note
     */
    async sendContextAwareMessage(
        sessionId: string,
        content: string,
        noteId: string,
        options?: ChatCompletionOptions,
        streamCallback?: StreamCallback
    ): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content
        };

        session.messages.push(userMessage);
        session.isStreaming = true;

        try {
            // Immediately save the user message
            await chatStorageService.updateChat(session.id, session.messages);

            // Log message processing
            log.info(`Processing context-aware message: "${content.substring(0, 100)}..."`);
            log.info(`Using context from note: ${noteId}`);

            // Get showThinking option if it exists
            const showThinking = options?.showThinking === true;

            // Select appropriate pipeline based on whether agent tools are needed
            const pipelineType = showThinking ? 'agent' : 'default';
            const pipeline = this.getPipeline(pipelineType);

            // Execute the pipeline with note context
            const response = await pipeline.execute({
                messages: session.messages,
                options: options || session.options || {},
                noteId,
                query: content,
                showThinking,
                streamCallback
            });

            // Add assistant message
            const assistantMessage: Message = {
                role: 'assistant',
                content: response.text
            };

            session.messages.push(assistantMessage);
            session.isStreaming = false;

            // Save the complete conversation
            await chatStorageService.updateChat(session.id, session.messages);

            // If first message, update the title
            if (session.messages.length <= 2 && (!session.title || session.title === 'New Chat')) {
                const title = this.generateTitleFromMessages(session.messages);
                session.title = title;
                await chatStorageService.updateChat(session.id, session.messages, title);
            }

            return session;

        } catch (error: any) {
            session.isStreaming = false;
            console.error('Error in context-aware chat:', error);

            // Add error message
            const errorMessage: Message = {
                role: 'assistant',
                content: ERROR_PROMPTS.USER_ERRORS.CONTEXT_ERROR
            };

            session.messages.push(errorMessage);

            // Save the conversation with error
            await chatStorageService.updateChat(session.id, session.messages);

            // Notify streaming error if callback provided
            if (streamCallback) {
                streamCallback(errorMessage.content, true);
            }

            return session;
        }
    }

    /**
     * Add context from the current note to the chat
     *
     * @param sessionId - The ID of the chat session
     * @param noteId - The ID of the note to add context from
     * @param useSmartContext - Whether to use smart context extraction (default: true)
     * @returns The updated chat session
     */
    async addNoteContext(sessionId: string, noteId: string, useSmartContext = true): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);

        // Get the last user message to use as context for semantic search
        const lastUserMessage = [...session.messages].reverse()
            .find(msg => msg.role === 'user' && msg.content.length > 10)?.content || '';

        // Use the context extraction stage from the pipeline
        const pipeline = this.getPipeline();
        const contextResult = await pipeline.stages.contextExtraction.execute({
            noteId,
            query: lastUserMessage,
            useSmartContext
        });

        const contextMessage: Message = {
            role: 'user',
            content: CONTEXT_PROMPTS.NOTE_CONTEXT_PROMPT.replace('{context}', contextResult.context)
        };

        session.messages.push(contextMessage);
        await chatStorageService.updateChat(session.id, session.messages);

        return session;
    }

    /**
     * Add semantically relevant context from a note based on a specific query
     *
     * @param sessionId - The ID of the chat session
     * @param noteId - The ID of the note to add context from
     * @param query - The specific query to find relevant information for
     * @returns The updated chat session
     */
    async addSemanticNoteContext(sessionId: string, noteId: string, query: string): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);

        // Use the semantic context extraction stage from the pipeline
        const pipeline = this.getPipeline();
        const contextResult = await pipeline.stages.semanticContextExtraction.execute({
            noteId,
            query
        });

        const contextMessage: Message = {
            role: 'user',
            content: CONTEXT_PROMPTS.SEMANTIC_NOTE_CONTEXT_PROMPT
                .replace('{query}', query)
                .replace('{context}', contextResult.context)
        };

        session.messages.push(contextMessage);
        await chatStorageService.updateChat(session.id, session.messages);

        return session;
    }

    /**
     * Get all user's chat sessions
     */
    async getAllSessions(): Promise<ChatSession[]> {
        const chats = await chatStorageService.getAllChats();

        return chats.map(chat => ({
            id: chat.id,
            title: chat.title,
            messages: chat.messages,
            isStreaming: this.activeSessions.get(chat.id)?.isStreaming || false
        }));
    }

    /**
     * Delete a chat session
     */
    async deleteSession(sessionId: string): Promise<boolean> {
        this.activeSessions.delete(sessionId);
        return chatStorageService.deleteChat(sessionId);
    }

    /**
     * Get pipeline performance metrics
     */
    getPipelineMetrics(pipelineType: string = 'default'): any {
        const pipeline = this.getPipeline(pipelineType);
        return pipeline.getMetrics();
    }

    /**
     * Reset pipeline metrics
     */
    resetPipelineMetrics(pipelineType: string = 'default'): void {
        const pipeline = this.getPipeline(pipelineType);
        pipeline.resetMetrics();
    }

    /**
     * Generate a title from the first messages in a conversation
     */
    private generateTitleFromMessages(messages: Message[]): string {
        if (messages.length < 2) {
            return 'New Chat';
        }

        // Get the first user message
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (!firstUserMessage) {
            return 'New Chat';
        }

        // Extract first line or first few words
        const firstLine = firstUserMessage.content.split('\n')[0].trim();

        if (firstLine.length <= 30) {
            return firstLine;
        }

        // Take first 30 chars if too long
        return firstLine.substring(0, 27) + '...';
    }

    /**
     * Generate a chat completion with a sequence of messages
     * @param messages Messages array to send to the AI provider
     * @param options Chat completion options
     */
    async generateChatCompletion(messages: Message[], options: ChatCompletionOptions = {}): Promise<ChatResponse> {
        log.info(`========== CHAT SERVICE FLOW CHECK ==========`);
        log.info(`Entered generateChatCompletion in ChatService`);
        log.info(`Using pipeline for chat completion: ${this.getPipeline(options.pipeline).constructor.name}`);
        log.info(`Tool support enabled: ${options.enableTools !== false}`);

        try {
            // Get AI service
            const service = await aiServiceManager.getService();
            if (!service) {
                throw new Error('No AI service available');
            }

            log.info(`Using AI service: ${service.getName()}`);

            // Prepare query extraction
            const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
            const query = lastUserMessage ? lastUserMessage.content : undefined;

            // For advanced context processing, use the pipeline
            if (options.useAdvancedContext && query) {
                log.info(`Using chat pipeline for advanced context with query: ${query.substring(0, 50)}...`);

                // Create a pipeline input with the query and messages
                const pipelineInput: ChatPipelineInput = {
                    messages,
                    options,
                    query,
                    noteId: options.noteId
                };

                // Execute the pipeline
                const pipeline = this.getPipeline(options.pipeline);
                const response = await pipeline.execute(pipelineInput);
                log.info(`Pipeline execution complete, response contains tools: ${response.tool_calls ? 'yes' : 'no'}`);
                if (response.tool_calls) {
                    log.info(`Tool calls in pipeline response: ${response.tool_calls.length}`);
                }
                return response;
            }

            // If not using advanced context, use direct service call
            return await service.generateChatCompletion(messages, options);
        } catch (error: any) {
            console.error('Error in generateChatCompletion:', error);
            throw error;
        }
    }
}

// Singleton instance
const chatService = new ChatService();
export default chatService;
