/**
 * Hierarchy Context Constants
 *
 * This file centralizes all strings used in the note hierarchy context
 * functionality. These strings are used when displaying information about parent-child
 * relationships and note relations in the LLM context building process.
 */

export const HIERARCHY_STRINGS = {
    // Parent context strings
    PARENT_CONTEXT: {
        NO_PARENT_CONTEXT: 'No parent context available.',
        CURRENT_NOTE: (title: string) => `${title} (current note)`,
    },

    // Child context strings
    CHILD_CONTEXT: {
        NO_CHILD_NOTES: 'No child notes.',
        CHILD_NOTES_HEADER: (count: number) => `Child notes (${count} total)`,
        CHILD_SUMMARY_PREFIX: 'Summary: ',
        MORE_CHILDREN: (count: number) => `... and ${count} more child notes not shown`,
        ERROR_RETRIEVING: 'Error retrieving child notes.'
    },

    // Linked notes context strings
    LINKED_NOTES: {
        NO_LINKED_NOTES: 'No linked notes.',
        OUTGOING_RELATIONS_HEADER: (count: number) => `Outgoing relations (${count} total)`,
        INCOMING_RELATIONS_HEADER: (count: number) => `Incoming relations (${count} total)`,
        DEFAULT_RELATION: 'relates to',
        MORE_OUTGOING: (count: number) => `... and ${count} more outgoing relations not shown`,
        MORE_INCOMING: (count: number) => `... and ${count} more incoming relations not shown`,
        ERROR_RETRIEVING: 'Error retrieving linked notes.'
    }
};
