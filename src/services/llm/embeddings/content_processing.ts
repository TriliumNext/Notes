import becca from "../../../becca/becca.js";
import type { NoteEmbeddingContext } from "./types.js";
import sanitizeHtml from "sanitize-html";
import type BNote from "../../../becca/entities/bnote.js";

/**
 * Clean note content by removing HTML tags and normalizing whitespace
 */
export async function cleanNoteContent(content: string, type: string, mime: string): Promise<string> {
    if (!content) return '';

    // If it's HTML content, remove HTML tags
    if ((type === 'text' && mime === 'text/html') || content.includes('<div>') || content.includes('<p>')) {
        // Use sanitizeHtml to remove all HTML tags
        content = sanitizeHtml(content, {
            allowedTags: [],
            allowedAttributes: {},
            textFilter: (text) => {
                // Normalize the text, removing excessive whitespace
                return text.replace(/\s+/g, ' ');
            }
        });
    }

    // Additional cleanup for any remaining HTML entities
    content = content
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // Normalize whitespace (replace multiple spaces/newlines with single space)
    content = content.replace(/\s+/g, ' ');

    // Trim the content
    content = content.trim();

    // Import constants directly
    const { LLM_CONSTANTS } = await import('../constants/provider_constants.js');
    // Truncate if extremely long
    if (content.length > LLM_CONSTANTS.CONTENT.MAX_TOTAL_CONTENT_LENGTH) {
        content = content.substring(0, LLM_CONSTANTS.CONTENT.MAX_TOTAL_CONTENT_LENGTH) + ' [content truncated]';
    }

    return content;
}

/**
 * Extract content from different note types
 */
export function extractStructuredContent(content: string, type: string, mime: string): string {
    try {
        if (!content) return '';

        // Special handling based on note type
        switch (type) {
            case 'mindMap':
            case 'relationMap':
            case 'canvas':
                if (mime === 'application/json') {
                    const jsonContent = JSON.parse(content);

                    if (type === 'canvas') {
                        // Extract text elements from canvas
                        if (jsonContent.elements && Array.isArray(jsonContent.elements)) {
                            const texts = jsonContent.elements
                                .filter((element: any) => element.type === 'text' && element.text)
                                .map((element: any) => element.text);
                            return texts.join('\n');
                        }
                    }
                    else if (type === 'mindMap') {
                        // Extract node text from mind map
                        const extractMindMapNodes = (node: any): string[] => {
                            let texts: string[] = [];
                            if (node.text) {
                                texts.push(node.text);
                            }
                            if (node.children && Array.isArray(node.children)) {
                                for (const child of node.children) {
                                    texts = texts.concat(extractMindMapNodes(child));
                                }
                            }
                            return texts;
                        };

                        if (jsonContent.root) {
                            return extractMindMapNodes(jsonContent.root).join('\n');
                        }
                    }
                    else if (type === 'relationMap') {
                        // Extract relation map entities and connections
                        let result = '';

                        if (jsonContent.notes && Array.isArray(jsonContent.notes)) {
                            result += 'Notes: ' + jsonContent.notes
                                .map((note: any) => note.title || note.name)
                                .filter(Boolean)
                                .join(', ') + '\n';
                        }

                        if (jsonContent.relations && Array.isArray(jsonContent.relations)) {
                            result += 'Relations: ' + jsonContent.relations
                                .map((rel: any) => {
                                    const sourceNote = jsonContent.notes.find((n: any) => n.noteId === rel.sourceNoteId);
                                    const targetNote = jsonContent.notes.find((n: any) => n.noteId === rel.targetNoteId);
                                    const source = sourceNote ? (sourceNote.title || sourceNote.name) : 'unknown';
                                    const target = targetNote ? (targetNote.title || targetNote.name) : 'unknown';
                                    return `${source} → ${rel.name || ''} → ${target}`;
                                })
                                .join('; ');
                        }

                        return result;
                    }
                }
                return JSON.stringify(content);

            case 'mermaid':
                // Return mermaid diagrams as-is (they're human-readable)
                return content;

            case 'geoMap':
                if (mime === 'application/json') {
                    const jsonContent = JSON.parse(content);
                    let result = '';

                    if (jsonContent.markers && Array.isArray(jsonContent.markers)) {
                        result += jsonContent.markers
                            .map((marker: any) => {
                                return `Location: ${marker.title || ''} (${marker.lat}, ${marker.lng})${marker.description ? ' - ' + marker.description : ''}`;
                            })
                            .join('\n');
                    }

                    return result || JSON.stringify(content);
                }
                return JSON.stringify(content);

            case 'file':
            case 'image':
                // For files and images, just return a placeholder
                return `[${type} attachment]`;

            default:
                return content;
        }
    }
    catch (error) {
        console.error(`Error extracting content from ${type} note:`, error);
        return content;
    }
}

/**
 * Gets context for a note to be embedded
 */
export async function getNoteEmbeddingContext(noteId: string): Promise<NoteEmbeddingContext> {
    const note = becca.getNote(noteId);

    if (!note) {
        throw new Error(`Note ${noteId} not found`);
    }

    // Get parent note titles
    const parentNotes = note.getParentNotes();
    const parentTitles = parentNotes.map(note => note.title);

    // Get child note titles
    const childNotes = note.getChildNotes();
    const childTitles = childNotes.map(note => note.title);

    // Get all attributes (not just owned ones)
    const attributes = note.getAttributes().map(attr => ({
        type: attr.type,
        name: attr.name,
        value: attr.value
    }));

    // Get backlinks (notes that reference this note through relations)
    const targetRelations = note.getTargetRelations();
    const backlinks = targetRelations
        .map(relation => {
            const sourceNote = relation.getNote();
            if (sourceNote && sourceNote.type !== 'search') { // Filter out search notes
                return {
                    sourceNoteId: sourceNote.noteId,
                    sourceTitle: sourceNote.title,
                    relationName: relation.name
                };
            }
            return null;
        })
        .filter((item): item is { sourceNoteId: string; sourceTitle: string; relationName: string } => item !== null);

    // Get related notes through relations
    const relations = note.getRelations();
    const relatedNotes = relations
        .map(relation => {
            const targetNote = relation.targetNote;
            if (targetNote) {
                return {
                    targetNoteId: targetNote.noteId,
                    targetTitle: targetNote.title,
                    relationName: relation.name
                };
            }
            return null;
        })
        .filter((item): item is { targetNoteId: string; targetTitle: string; relationName: string } => item !== null);

    // Extract important labels that might affect semantics
    const labelValues: Record<string, string> = {};
    const labels = note.getLabels();
    for (const label of labels) {
        // Skip CSS and UI-related labels that don't affect semantics
        if (!label.name.startsWith('css') &&
            !label.name.startsWith('workspace') &&
            !label.name.startsWith('hide') &&
            !label.name.startsWith('collapsed')) {
            labelValues[label.name] = label.value;
        }
    }

    // Get attachments
    const attachments = note.getAttachments().map(att => ({
        title: att.title,
        mime: att.mime
    }));

    // Get content
    let content = "";

    try {
        // Use the enhanced context extractor for improved content extraction
        // We're using a dynamic import to avoid circular dependencies
        const { ContextExtractor } = await import('../../llm/context/index.js');
        const contextExtractor = new ContextExtractor();

        // Get the content using the enhanced formatNoteContent method in context extractor
        const noteContent = await contextExtractor.getNoteContent(noteId);

        if (noteContent) {
            content = noteContent;

            // For large content, consider chunking or summarization
            if (content.length > 10000) {
                // Large content handling options:

                // Option 1: Use our summarization feature
                const summary = await contextExtractor.getNoteSummary(noteId);
                if (summary) {
                    content = summary;
                }

                // Option 2: Alternative approach - use the first chunk if summarization fails
                if (content.length > 10000) {
                    const chunks = await contextExtractor.getChunkedNoteContent(noteId);
                    if (chunks && chunks.length > 0) {
                        // Use the first chunk (most relevant/beginning)
                        content = chunks[0];
                    }
                }
            }
        } else {
            // Fallback to original method if context extractor fails
            const rawContent = String(await note.getContent() || "");

            // Process the content based on note type to extract meaningful text
            if (note.type === 'text' || note.type === 'code') {
                content = rawContent;
            } else if (['canvas', 'mindMap', 'relationMap', 'mermaid', 'geoMap'].includes(note.type)) {
                // Process structured content types
                content = extractStructuredContent(rawContent, note.type, note.mime);
            } else if (note.type === 'image' || note.type === 'file') {
                content = `[${note.type} attachment: ${note.mime}]`;
            }

            // Clean the content to remove HTML tags and normalize whitespace
            content = await cleanNoteContent(content, note.type, note.mime);
        }
    } catch (err) {
        console.error(`Error getting content for note ${noteId}:`, err);
        content = `[Error extracting content]`;

        // Try fallback to original method
        try {
            const rawContent = String(await note.getContent() || "");
            if (note.type === 'text' || note.type === 'code') {
                content = rawContent;
            } else if (['canvas', 'mindMap', 'relationMap', 'mermaid', 'geoMap'].includes(note.type)) {
                content = extractStructuredContent(rawContent, note.type, note.mime);
            }
            content = await cleanNoteContent(content, note.type, note.mime);
        } catch (fallbackErr) {
            console.error(`Fallback content extraction also failed for note ${noteId}:`, fallbackErr);
        }
    }

    // Get template/inheritance relationships
    // This is from FNote.getNotesToInheritAttributesFrom - recreating similar logic for BNote
    const templateRelations = note.getRelations('template').concat(note.getRelations('inherit'));
    const templateTitles = templateRelations
        .map(rel => rel.targetNote)
        .filter((note): note is BNote => note !== undefined)
        .map(templateNote => templateNote.title);

    return {
        noteId: note.noteId,
        title: note.title,
        content: content,
        type: note.type,
        mime: note.mime,
        dateCreated: note.dateCreated || "",
        dateModified: note.dateModified || "",
        attributes,
        parentTitles,
        childTitles,
        attachments,
        backlinks,
        relatedNotes,
        labelValues,
        templateTitles
    };
}
