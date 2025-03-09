import type { Message, ChatCompletionOptions } from './ai_interface.js';
import aiServiceManager from './ai_service_manager.js';
import chatStorageService from './chat_storage_service.js';
import contextExtractor from './context_extractor.js';

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
                content: `Error: Failed to generate response. ${error.message || 'Please check AI settings and try again.'}`
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
     */
    async addNoteContext(sessionId: string, noteId: string): Promise<ChatSession> {
        const session = await this.getOrCreateSession(sessionId);
        const context = await contextExtractor.getFullContext(noteId);

        const contextMessage: Message = {
            role: 'user',
            content: `Here is the content of the note I want to discuss:\n\n${context}\n\nPlease help me with this information.`
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
