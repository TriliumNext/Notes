import sql from '../sql.js';
import sanitizeHtml from 'sanitize-html';

/**
 * Utility class for extracting context from notes to provide to AI models
 */
export class ContextExtractor {
    /**
     * Get the content of a note
     */
    async getNoteContent(noteId: string): Promise<string | null> {
        const note = await sql.getRow<{content: string, type: string, mime: string, title: string}>(
            `SELECT note_contents.content, notes.type, notes.mime, notes.title
             FROM notes
             JOIN note_contents ON notes.noteId = note_contents.noteId
             WHERE notes.noteId = ?`,
            [noteId]
        );

        if (!note) {
            return null;
        }

        return this.formatNoteContent(note.content, note.type, note.mime, note.title);
    }

    /**
     * Get a set of parent notes to provide hierarchical context
     */
    async getParentContext(noteId: string, maxDepth = 3): Promise<string> {
        const parents = await this.getParentNotes(noteId, maxDepth);
        if (!parents.length) return '';

        let context = 'Here is the hierarchical context for the current note:\n\n';

        for (const parent of parents) {
            context += `- ${parent.title}\n`;
        }

        return context + '\n';
    }

    /**
     * Get child notes to provide additional context
     */
    async getChildContext(noteId: string, maxChildren = 5): Promise<string> {
        const children = await sql.getRows<{noteId: string, title: string}>(
            `SELECT noteId, title FROM notes
             WHERE parentNoteId = ? AND isDeleted = 0
             LIMIT ?`,
            [noteId, maxChildren]
        );

        if (!children.length) return '';

        let context = 'The current note has these child notes:\n\n';

        for (const child of children) {
            context += `- ${child.title}\n`;
        }

        return context + '\n';
    }

    /**
     * Get notes linked to this note
     */
    async getLinkedNotesContext(noteId: string, maxLinks = 5): Promise<string> {
        const linkedNotes = await sql.getRows<{title: string}>(
            `SELECT title FROM notes
             WHERE noteId IN (
                SELECT value FROM attributes
                WHERE noteId = ? AND type = 'relation'
                LIMIT ?
             )`,
            [noteId, maxLinks]
        );

        if (!linkedNotes.length) return '';

        let context = 'This note has relationships with these notes:\n\n';

        for (const linked of linkedNotes) {
            context += `- ${linked.title}\n`;
        }

        return context + '\n';
    }

    /**
     * Format the content of a note based on its type
     */
    private formatNoteContent(content: string, type: string, mime: string, title: string): string {
        let formattedContent = `# ${title}\n\n`;

        switch (type) {
            case 'text':
                // Remove HTML formatting for text notes
                formattedContent += this.sanitizeHtml(content);
                break;
            case 'code':
                // Format code notes with code blocks
                formattedContent += '```\n' + content + '\n```';
                break;
            default:
                // For other notes, just use the content as is
                formattedContent += this.sanitizeHtml(content);
        }

        return formattedContent;
    }

    /**
     * Sanitize HTML content to plain text
     */
    private sanitizeHtml(html: string): string {
        return sanitizeHtml(html, {
            allowedTags: [],
            allowedAttributes: {},
            textFilter: (text) => {
                // Replace multiple newlines with a single one
                return text.replace(/\n\s*\n/g, '\n\n');
            }
        });
    }

    /**
     * Get parent notes in the hierarchy
     */
    private async getParentNotes(noteId: string, maxDepth: number): Promise<{noteId: string, title: string}[]> {
        const parentNotes: {noteId: string, title: string}[] = [];
        let currentNoteId = noteId;

        for (let i = 0; i < maxDepth; i++) {
            const parent = await sql.getRow<{parentNoteId: string, title: string}>(
                `SELECT branches.parentNoteId, notes.title
                 FROM branches
                 JOIN notes ON branches.parentNoteId = notes.noteId
                 WHERE branches.noteId = ? AND branches.isDeleted = 0 LIMIT 1`,
                [currentNoteId]
            );

            if (!parent || parent.parentNoteId === 'root') {
                break;
            }

            parentNotes.unshift({
                noteId: parent.parentNoteId,
                title: parent.title
            });

            currentNoteId = parent.parentNoteId;
        }

        return parentNotes;
    }

    /**
     * Get the full context for a note, including parent hierarchy, content, and children
     */
    async getFullContext(noteId: string): Promise<string> {
        const noteContent = await this.getNoteContent(noteId);
        if (!noteContent) {
            return 'Note not found';
        }

        const parentContext = await this.getParentContext(noteId);
        const childContext = await this.getChildContext(noteId);
        const linkedContext = await this.getLinkedNotesContext(noteId);

        return [
            parentContext,
            noteContent,
            childContext,
            linkedContext
        ].filter(Boolean).join('\n\n');
    }
}

// Singleton instance
const contextExtractor = new ContextExtractor();
export default contextExtractor;
