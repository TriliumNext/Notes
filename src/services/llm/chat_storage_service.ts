import notes from '../notes.js';
import sql from '../sql.js';
import attributes from '../attributes.js';
import type { Message } from './ai_interface.js';

interface StoredChat {
    id: string;
    title: string;
    messages: Message[];
    noteId?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Service for storing and retrieving chat histories
 * Chats are stored as a special type of note
 */
export class ChatStorageService {
    private static readonly CHAT_LABEL = 'triliumChat';
    private static readonly CHAT_ROOT_LABEL = 'triliumChatRoot';
    private static readonly CHAT_TYPE = 'code';
    private static readonly CHAT_MIME = 'application/json';

    /**
     * Get or create the root note for all chats
     */
    async getOrCreateChatRoot(): Promise<string> {
        const existingRoot = await sql.getRow<{noteId: string}>(
            `SELECT noteId FROM attributes WHERE name = ? AND value = ?`,
            ['label', ChatStorageService.CHAT_ROOT_LABEL]
        );

        if (existingRoot) {
            return existingRoot.noteId;
        }

        // Create root note for chats
        const { note } = notes.createNewNote({
            parentNoteId: 'root',
            title: 'AI Chats',
            type: 'text',
            content: 'This note contains your saved AI chat conversations.'
        });

        attributes.createLabel(
            note.noteId,
            ChatStorageService.CHAT_ROOT_LABEL,
            ''
        );

        return note.noteId;
    }

    /**
     * Create a new chat
     */
    async createChat(title: string, messages: Message[] = []): Promise<StoredChat> {
        const rootNoteId = await this.getOrCreateChatRoot();
        const now = new Date();

        const { note } = notes.createNewNote({
            parentNoteId: rootNoteId,
            title: title || 'New Chat ' + now.toLocaleString(),
            type: ChatStorageService.CHAT_TYPE,
            mime: ChatStorageService.CHAT_MIME,
            content: JSON.stringify({
                messages,
                createdAt: now,
                updatedAt: now
            }, null, 2)
        });

        attributes.createLabel(
            note.noteId,
            ChatStorageService.CHAT_LABEL,
            ''
        );

        return {
            id: note.noteId,
            title: title || 'New Chat ' + now.toLocaleString(),
            messages,
            noteId: note.noteId,
            createdAt: now,
            updatedAt: now
        };
    }

    /**
     * Get all chats
     */
    async getAllChats(): Promise<StoredChat[]> {
        const chats = await sql.getRows<{noteId: string, title: string, dateCreated: string, dateModified: string, content: string}>(
            `SELECT notes.noteId, notes.title, notes.dateCreated, notes.dateModified, note_contents.content
             FROM notes
             JOIN note_contents ON notes.noteId = note_contents.noteId
             JOIN attributes ON notes.noteId = attributes.noteId
             WHERE attributes.name = ? AND attributes.value = ?
             ORDER BY notes.dateModified DESC`,
            ['label', ChatStorageService.CHAT_LABEL]
        );

        return chats.map(chat => {
            let messages: Message[] = [];
            try {
                const content = JSON.parse(chat.content);
                messages = content.messages || [];
            } catch (e) {
                console.error('Failed to parse chat content:', e);
            }

            return {
                id: chat.noteId,
                title: chat.title,
                messages,
                noteId: chat.noteId,
                createdAt: new Date(chat.dateCreated),
                updatedAt: new Date(chat.dateModified)
            };
        });
    }

    /**
     * Get a specific chat
     */
    async getChat(chatId: string): Promise<StoredChat | null> {
        const chat = await sql.getRow<{noteId: string, title: string, dateCreated: string, dateModified: string, content: string}>(
            `SELECT notes.noteId, notes.title, notes.dateCreated, notes.dateModified, note_contents.content
             FROM notes
             JOIN note_contents ON notes.noteId = note_contents.noteId
             WHERE notes.noteId = ?`,
            [chatId]
        );

        if (!chat) {
            return null;
        }

        let messages: Message[] = [];
        try {
            const content = JSON.parse(chat.content);
            messages = content.messages || [];
        } catch (e) {
            console.error('Failed to parse chat content:', e);
        }

        return {
            id: chat.noteId,
            title: chat.title,
            messages,
            noteId: chat.noteId,
            createdAt: new Date(chat.dateCreated),
            updatedAt: new Date(chat.dateModified)
        };
    }

    /**
     * Update messages in a chat
     */
    async updateChat(chatId: string, messages: Message[], title?: string): Promise<StoredChat | null> {
        const chat = await this.getChat(chatId);

        if (!chat) {
            return null;
        }

        const now = new Date();

        // Update content directly using SQL since we don't have a method for this in the notes service
        await sql.execute(
            `UPDATE note_contents SET content = ? WHERE noteId = ?`,
            [JSON.stringify({
                messages,
                createdAt: chat.createdAt,
                updatedAt: now
            }, null, 2), chatId]
        );

        // Update title if provided
        if (title && title !== chat.title) {
            await sql.execute(
                `UPDATE notes SET title = ? WHERE noteId = ?`,
                [title, chatId]
            );
        }

        return {
            ...chat,
            title: title || chat.title,
            messages,
            updatedAt: now
        };
    }

    /**
     * Delete a chat
     */
    async deleteChat(chatId: string): Promise<boolean> {
        try {
            // Mark note as deleted using SQL since we don't have deleteNote in the exports
            await sql.execute(
                `UPDATE notes SET isDeleted = 1 WHERE noteId = ?`,
                [chatId]
            );

            return true;
        } catch (e) {
            console.error('Failed to delete chat:', e);
            return false;
        }
    }
}

// Singleton instance
const chatStorageService = new ChatStorageService();
export default chatStorageService;
