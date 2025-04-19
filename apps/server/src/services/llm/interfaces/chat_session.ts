/**
 * Interfaces for chat sessions and related data
 */
import type { Message } from "../ai_interface.js";

/**
 * Represents a source note from which context is drawn
 */
export interface NoteSource {
    noteId: string;
    title: string;
    content?: string;
    similarity?: number;
    branchId?: string;
}

/**
 * Represents a chat session with message history
 */
export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: Date;
    lastActive: Date;
    noteContext?: string;
    metadata: Record<string, any>;
}

/**
 * Represents a single chat message
 */
export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
}
