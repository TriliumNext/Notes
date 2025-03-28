import becca from '../../../becca/becca.js';
import { sanitizeHtmlContent } from './note_content.js';

/**
 * Get a list of parent notes for a given note
 */
export async function getParentNotes(noteId: string, maxParents: number = 5): Promise<{id: string, title: string}[]> {
    const note = becca.getNote(noteId);

    if (!note) {
        return [];
    }

    try {
        // Use Becca API to get parent branches and notes
        const parentBranches = note.getParentBranches();

        if (!parentBranches || parentBranches.length === 0) {
            return [];
        }

        // Map to get parent notes, limiting to maxParents
        const parentNotes = parentBranches
            .slice(0, maxParents)
            .map(branch => {
                if (!branch.parentNote) {
                    return null;
                }

                return {
                    id: branch.parentNote.noteId,
                    title: branch.parentNote.title
                };
            })
            .filter(note => note !== null) as {id: string, title: string}[];

        return parentNotes;
    } catch (error) {
        console.error(`Error getting parent notes for ${noteId}:`, error);
        return [];
    }
}

/**
 * Get hierarchical context of parent notes
 * This function builds a representation of the note hierarchy to provide context
 */
export async function getParentContext(
    noteId: string,
    maxDepth: number = 3,
    maxParents: number = 3,
    includeCurrentNote: boolean = true
): Promise<string> {
    // Note: getParentNotes has been updated to use Becca API
    const note = becca.getNote(noteId);

    if (!note) {
        return "";
    }

    const visited = new Set<string>();
    let context = "";

    // Helper function to build the hierarchical context recursively
    async function buildHierarchy(currentNoteId: string, depth: number, prefix: string = ""): Promise<void> {
        if (depth > maxDepth || visited.has(currentNoteId)) {
            return;
        }

        visited.add(currentNoteId);
        const parentNotes = await getParentNotes(currentNoteId, maxParents);

        for (const parent of parentNotes) {
            // Add parent with proper indentation
            context += `${prefix}- ${parent.title}\n`;

            // Recursively add parents of this parent with increased indentation
            await buildHierarchy(parent.id, depth + 1, prefix + "  ");
        }
    }

    // Build the hierarchy starting from the current note
    await buildHierarchy(noteId, 1);

    // Add the current note at the end with appropriate indentation
    if (includeCurrentNote) {
        // Determine the indentation level based on hierarchy depth
        let indentation = "";
        if (context) {
            // If we have parent context, add the current note with proper indentation
            indentation = "  ".repeat(1); // One level deeper than parents
            context += `${indentation}> ${note.title} (current note)\n`;
        } else {
            // If no parents, just add the current note
            context += `> ${note.title} (current note)\n`;
        }
    }

    if (!context) {
        return "No parent context available.";
    }

    return context;
}

/**
 * Get context from child notes
 */
export async function getChildContext(
    noteId: string,
    maxChildren: number = 10,
    includeContent: boolean = false
): Promise<string> {
    const note = becca.getNote(noteId);

    if (!note) {
        return "";
    }

    try {
        // Get child notes using Becca API
        const childNotes = note.getChildNotes();

        if (!childNotes || childNotes.length === 0) {
            return "No child notes.";
        }

        let context = `Child notes (${childNotes.length} total):\n`;

        // Limit the number of children included in context
        const limitedChildren = childNotes.slice(0, maxChildren);

        for (const childNote of limitedChildren) {
            context += `- ${childNote.title}\n`;

            // Optionally include a snippet of content
            if (includeContent) {
                try {
                    const content = String(await childNote.getContent() || "");

                    // Truncate and sanitize content
                    const truncatedContent = sanitizeHtmlContent(content)
                        .substring(0, 100)
                        .trim()
                        .replace(/\n/g, ' ');

                    if (truncatedContent) {
                        context += `  Summary: ${truncatedContent}${truncatedContent.length >= 100 ? '...' : ''}\n`;
                    }
                } catch (e) {
                    // Silently skip content errors
                }
            }
        }

        // Add note about truncation if needed
        if (childNotes.length > maxChildren) {
            context += `... and ${childNotes.length - maxChildren} more child notes not shown\n`;
        }

        return context;
    } catch (error) {
        console.error(`Error getting child context for ${noteId}:`, error);
        return "Error retrieving child notes.";
    }
}

/**
 * Get context from linked notes (relations)
 */
export async function getLinkedNotesContext(
    noteId: string,
    maxRelations: number = 10
): Promise<string> {
    const note = becca.getNote(noteId);

    if (!note) {
        return "";
    }

    try {
        // Get all relations using Becca API
        const relations = note.getRelations();

        if (!relations || relations.length === 0) {
            return "No linked notes.";
        }

        // Get incoming relations as well
        const incomingRelations = note.getTargetRelations();

        let context = "";

        // Handle outgoing relations
        if (relations.length > 0) {
            context += `Outgoing relations (${relations.length} total):\n`;

            // Limit the number of relations included in context
            const limitedRelations = relations.slice(0, maxRelations);

            for (const relation of limitedRelations) {
                const targetNote = becca.getNote(relation.value || "");
                if (targetNote) {
                    const relationName = relation.name || 'relates to';
                    context += `- ${relationName} → ${targetNote.title}\n`;
                }
            }

            // Add note about truncation if needed
            if (relations.length > maxRelations) {
                context += `... and ${relations.length - maxRelations} more outgoing relations not shown\n`;
            }
        }

        // Handle incoming relations
        if (incomingRelations && incomingRelations.length > 0) {
            if (context) context += "\n";

            context += `Incoming relations (${incomingRelations.length} total):\n`;

            // Limit the number of relations included in context
            const limitedIncoming = incomingRelations.slice(0, maxRelations);

            for (const relation of limitedIncoming) {
                const sourceNote = becca.getNote(relation.value || "");
                if (sourceNote) {
                    const relationName = relation.name || 'relates to';
                    context += `- ${sourceNote.title} → ${relationName}\n`;
                }
            }

            // Add note about truncation if needed
            if (incomingRelations.length > maxRelations) {
                context += `... and ${incomingRelations.length - maxRelations} more incoming relations not shown\n`;
            }
        }

        return context || "No linked notes.";
    } catch (error) {
        console.error(`Error getting linked notes context for ${noteId}:`, error);
        return "Error retrieving linked notes.";
    }
}
