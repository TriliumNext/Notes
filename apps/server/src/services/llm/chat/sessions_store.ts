/**
 * In-memory storage for chat sessions
 */
import log from "../../log.js";
import { LLM_CONSTANTS } from '../constants/provider_constants.js';
import { SEARCH_CONSTANTS } from '../constants/search_constants.js';
import { randomString } from "../../utils.js";
import type { ChatSession, ChatMessage } from '../interfaces/chat_session.js';

// In-memory storage for sessions
const sessions = new Map<string, ChatSession>();

// Flag to track if cleanup timer has been initialized
let cleanupInitialized = false;

/**
 * Provides methods to manage chat sessions
 */
class SessionsStore {
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
        log.info("Session cleanup timer initialized");
    }

    /**
     * Get all sessions
     */
    getAllSessions(): Map<string, ChatSession> {
        return sessions;
    }

    /**
     * Get a specific session by ID
     */
    getSession(sessionId: string): ChatSession | undefined {
        return sessions.get(sessionId);
    }

    /**
     * Create a new session
     */
    createSession(options: {
        chatNoteId: string;
        title?: string;
        systemPrompt?: string;
        contextNoteId?: string;
        maxTokens?: number;
        model?: string;
        provider?: string;
        temperature?: number;
    }): ChatSession {
        this.initializeCleanupTimer();

        const title = options.title || 'Chat Session';
        const sessionId = options.chatNoteId;
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

        // Create and store the session
        const session: ChatSession = {
            id: sessionId,
            title,
            messages,
            createdAt: now,
            lastActive: now,
            noteContext: options.contextNoteId,
            metadata: {
                temperature: options.temperature || SEARCH_CONSTANTS.TEMPERATURE.DEFAULT,
                maxTokens: options.maxTokens,
                model: options.model,
                provider: options.provider,
                sources: [],
                toolExecutions: [],
                lastUpdated: now.toISOString()
            }
        };

        sessions.set(sessionId, session);
        log.info(`Created in-memory session for Chat Note ID: ${sessionId}`);

        return session;
    }

    /**
     * Update a session's last active timestamp
     */
    touchSession(sessionId: string): boolean {
        const session = sessions.get(sessionId);
        if (!session) {
            return false;
        }

        session.lastActive = new Date();
        return true;
    }

    /**
     * Delete a session
     */
    deleteSession(sessionId: string): boolean {
        return sessions.delete(sessionId);
    }

    /**
     * Record a tool execution in the session metadata
     */
    recordToolExecution(chatNoteId: string, tool: any, result: string, error?: string): void {
        if (!chatNoteId) return;

        const session = sessions.get(chatNoteId);
        if (!session) return;

        try {
            const toolExecutions = session.metadata.toolExecutions || [];

            // Format tool execution record
            const execution = {
                id: tool.id || `tool-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                name: tool.function?.name || 'unknown',
                arguments: typeof tool.function?.arguments === 'string'
                    ? (() => { try { return JSON.parse(tool.function.arguments); } catch { return tool.function.arguments; } })()
                    : tool.function?.arguments || {},
                result: result,
                error: error,
                timestamp: new Date().toISOString()
            };

            // Add to tool executions
            toolExecutions.push(execution);
            session.metadata.toolExecutions = toolExecutions;

            log.info(`Recorded tool execution for ${execution.name} in session ${chatNoteId}`);
        } catch (err) {
            log.error(`Failed to record tool execution: ${err}`);
        }
    }
}

// Create singleton instance
const sessionsStore = new SessionsStore();
export default sessionsStore;
