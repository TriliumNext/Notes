import sql from "../../../services/sql.js";
import log from "../../../services/log.js";
import cls from "../../../services/cls.js";
import { queueNoteForEmbedding } from "./queue.js";

/**
 * Reprocess all notes to update embeddings
 */
export async function reprocessAllNotes() {
    log.info("Queueing all notes for embedding updates");

    // Get all non-deleted note IDs
    const noteIds = await sql.getColumn(
        "SELECT noteId FROM notes WHERE isDeleted = 0"
    );

    log.info(`Adding ${noteIds.length} notes to embedding queue`);

    // Process each note ID within a cls context
    for (const noteId of noteIds) {
        // Use cls.init to ensure proper context for each operation
        await cls.init(async () => {
            await queueNoteForEmbedding(noteId as string, 'UPDATE');
        });
    }
}

/**
 * Get current embedding statistics
 */
export async function getEmbeddingStats() {
    const totalNotesCount = await sql.getValue(
        "SELECT COUNT(*) FROM notes WHERE isDeleted = 0"
    ) as number;

    const embeddedNotesCount = await sql.getValue(
        "SELECT COUNT(DISTINCT noteId) FROM note_embeddings"
    ) as number;

    const queuedNotesCount = await sql.getValue(
        "SELECT COUNT(*) FROM embedding_queue WHERE failed = 0"
    ) as number;

    const failedNotesCount = await sql.getValue(
        "SELECT COUNT(*) FROM embedding_queue WHERE failed = 1"
    ) as number;

    // Get the last processing time by checking the most recent embedding
    const lastProcessedDate = await sql.getValue(
        "SELECT utcDateCreated FROM note_embeddings ORDER BY utcDateCreated DESC LIMIT 1"
    ) as string | null || null;

    // Calculate the actual completion percentage
    // When reprocessing, we need to consider notes in the queue as not completed yet
    // We calculate the percentage of notes that are embedded and NOT in the queue

    // First, get the count of notes that are both in the embeddings table and queue
    const notesInQueueWithEmbeddings = await sql.getValue(`
        SELECT COUNT(DISTINCT eq.noteId)
        FROM embedding_queue eq
        JOIN note_embeddings ne ON eq.noteId = ne.noteId
    `) as number;

    // The number of notes with valid, up-to-date embeddings
    const upToDateEmbeddings = embeddedNotesCount - notesInQueueWithEmbeddings;

    // Calculate the percentage of notes that are properly embedded
    const percentComplete = totalNotesCount > 0
        ? Math.round((upToDateEmbeddings / (totalNotesCount - failedNotesCount)) * 100)
        : 0;

    return {
        totalNotesCount,
        embeddedNotesCount,
        queuedNotesCount,
        failedNotesCount,
        lastProcessedDate,
        percentComplete: Math.max(0, Math.min(100, percentComplete)) // Ensure between 0-100
    };
}

/**
 * Cleanup function to remove stale or unused embeddings
 */
export function cleanupEmbeddings() {
    // Implementation can be added later when needed
    // For example, removing embeddings for deleted notes, etc.
}
