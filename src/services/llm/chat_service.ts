import type { Message, ChatCompletionOptions } from './ai_interface.js';
import aiServiceManager from './ai_service_manager.js';
import chatStorageService from './chat_storage_service.js';
import log from '../log.js';
import { CONTEXT_PROMPTS, ERROR_PROMPTS } from './constants/llm_prompt_constants.js';

export interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    isStreaming?: boolean;
    options?: ChatCompletionOptions;
}

/**
 * Service for managing chat interactions and history
 */
export class ChatService {
    private activeSessions: Map<string, ChatSession> = new Map();
    private streamingCallbacks: Map<string, (content: string, isDone: boolean) => void> = new Map();

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
        streamCallback?: (content: string, isDone: boolean) => void
    ): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content
        };

        session.messages.push(userMessage);
        session.isStreaming = true;

        // Set up streaming if callback provided
        if (streamCallback) {
            this.streamingCallbacks.set(session.id, streamCallback);
        }

        try {
            // Immediately save the user message
            await chatStorageService.updateChat(session.id, session.messages);

            // Generate AI response
            const response = await aiServiceManager.generateChatCompletion(
                session.messages,
                options || session.options
            );

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
            if (session.messages.length <= 2 && !session.title) {
                // Extract a title from the conversation
                const title = this.generateTitleFromMessages(session.messages);
                session.title = title;
                await chatStorageService.updateChat(session.id, session.messages, title);
            }

            // Notify streaming is complete
            if (streamCallback) {
                streamCallback(response.text, true);
                this.streamingCallbacks.delete(session.id);
            }

            return session;

        } catch (error: any) {
            session.isStreaming = false;
            console.error('Error in AI chat:', error);

            // Add error message so user knows something went wrong
            const errorMessage: Message = {
                role: 'assistant',
                content: ERROR_PROMPTS.USER_ERRORS.GENERAL_ERROR
            };

            session.messages.push(errorMessage);

            // Save the conversation with error
            await chatStorageService.updateChat(session.id, session.messages);

            // Notify streaming is complete with error
            if (streamCallback) {
                streamCallback(errorMessage.content, true);
                this.streamingCallbacks.delete(session.id);
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

        let context;

        if (useSmartContext && lastUserMessage) {
            // Use smart context that considers the query for better relevance
            context = await aiServiceManager.getContextExtractor().getSmartContext(noteId, lastUserMessage);
        } else {
            // Fall back to full context if smart context is disabled or no query available
            context = await aiServiceManager.getContextExtractor().getFullContext(noteId);
        }

        const contextMessage: Message = {
            role: 'user',
            content: CONTEXT_PROMPTS.NOTE_CONTEXT_PROMPT.replace('{context}', context)
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

        // Use semantic context that considers the query for better relevance
        const contextService = aiServiceManager.getContextService();
        const context = await contextService.getSemanticContext(noteId, query);

        const contextMessage: Message = {
            role: 'user',
            content: CONTEXT_PROMPTS.SEMANTIC_NOTE_CONTEXT_PROMPT
                .replace('{query}', query)
                .replace('{context}', context)
        };

        session.messages.push(contextMessage);
        await chatStorageService.updateChat(session.id, session.messages);

        return session;
    }

    /**
     * Send a message with enhanced semantic note context
     */
    async sendContextAwareMessage(
        sessionId: string,
        content: string,
        noteId: string,
        options?: ChatCompletionOptions,
        streamCallback?: (content: string, isDone: boolean) => void
    ): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);

        // Add user message
        const userMessage: Message = {
            role: 'user',
            content
        };

        session.messages.push(userMessage);
        session.isStreaming = true;

        // Set up streaming if callback provided
        if (streamCallback) {
            this.streamingCallbacks.set(session.id, streamCallback);
        }

        try {
            // Immediately save the user message
            await chatStorageService.updateChat(session.id, session.messages);

            // Get the Trilium Context Service for enhanced context
            const contextService = aiServiceManager.getContextService();

            // Get showThinking option if it exists
            const showThinking = options?.showThinking === true;

            log.info(`Processing LLM message: "${content.substring(0, 100)}..."`);
            log.info(`Using enhanced context with: noteId=${noteId}, showThinking=${showThinking}`);

            // Get enhanced context for this note and query
            const enhancedContext = await contextService.getAgentToolsContext(
                noteId,
                content,
                showThinking
            );

            // Create messages array with context using the improved method
            const messagesWithContext = await contextService.buildMessagesWithContext(
                session.messages,
                enhancedContext,
                aiServiceManager.getService()
            );

            // Generate AI response
            const response = await aiServiceManager.generateChatCompletion(
                messagesWithContext,
                options
            );

            // Add assistant message
            const assistantMessage: Message = {
                role: 'assistant',
                content: response.text
            };

            session.messages.push(assistantMessage);
            session.isStreaming = false;

            // Save the complete conversation (without system message)
            await chatStorageService.updateChat(session.id, session.messages);

            // If first message, update the title
            if (session.messages.length <= 2 && (!session.title || session.title === 'New Chat')) {
                const title = this.generateTitleFromMessages(session.messages);
                session.title = title;
                await chatStorageService.updateChat(session.id, session.messages, title);
            }

            // Notify streaming is complete
            if (streamCallback) {
                streamCallback(response.text, true);
                this.streamingCallbacks.delete(session.id);
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

            // Notify streaming is complete with error
            if (streamCallback) {
                streamCallback(errorMessage.content, true);
                this.streamingCallbacks.delete(session.id);
            }

            return session;
        }
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
        this.streamingCallbacks.delete(sessionId);
        return chatStorageService.deleteChat(sessionId);
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
}

// Singleton instance
const chatService = new ChatService();
export default chatService;
