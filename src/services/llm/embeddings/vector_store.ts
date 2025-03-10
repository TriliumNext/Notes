import sql from "../../sql.js";
import { randomString } from "../../utils.js";
import options from "../../options.js";
import dateUtils from "../../date_utils.js";
import log from "../../log.js";
import becca from "../../../becca/becca.js";
import type { NoteEmbeddingContext } from "./embeddings_interface.js";
import { getEmbeddingProviders, getEnabledEmbeddingProviders } from "./providers.js";
import eventService from "../../events.js";
import type BNote from "../../../becca/entities/bnote.js";

// Type definition for embedding result
interface EmbeddingResult {
    embedId: string;
    noteId: string;
    providerId: string;
    modelId: string;
    dimension: number;
    embedding: Float32Array;
    version: number;
    dateCreated: string;
    utcDateCreated: string;
    dateModified: string;
    utcDateModified: string;
}

// Type for queue item
interface QueueItem {
    noteId: string;
    operation: string;
    attempts: number;
}

/**
 * Computes the cosine similarity between two vectors
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
        throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let aMagnitude = 0;
    let bMagnitude = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        aMagnitude += a[i] * a[i];
        bMagnitude += b[i] * b[i];
    }

    aMagnitude = Math.sqrt(aMagnitude);
    bMagnitude = Math.sqrt(bMagnitude);

    if (aMagnitude === 0 || bMagnitude === 0) {
        return 0;
    }

    return dotProduct / (aMagnitude * bMagnitude);
}

/**
 * Converts embedding Float32Array to Buffer for storage in SQLite
 */
export function embeddingToBuffer(embedding: Float32Array): Buffer {
    return Buffer.from(embedding.buffer);
}

/**
 * Converts Buffer from SQLite back to Float32Array
 */
export function bufferToEmbedding(buffer: Buffer, dimension: number): Float32Array {
    return new Float32Array(buffer.buffer, buffer.byteOffset, dimension);
}

/**
 * Creates or updates an embedding for a note
 */
export async function storeNoteEmbedding(
    noteId: string,
    providerId: string,
    modelId: string,
    embedding: Float32Array
): Promise<string> {
    const dimension = embedding.length;
    const embeddingBlob = embeddingToBuffer(embedding);
    const now = dateUtils.localNowDateTime();
    const utcNow = dateUtils.utcNowDateTime();

    // Check if an embedding already exists for this note and provider/model
    const existingEmbed = await getEmbeddingForNote(noteId, providerId, modelId);

    if (existingEmbed) {
        // Update existing embedding
        await sql.execute(`
            UPDATE note_embeddings
            SET embedding = ?, dimension = ?, version = version + 1,
                dateModified = ?, utcDateModified = ?
            WHERE embedId = ?`,
            [embeddingBlob, dimension, now, utcNow, existingEmbed.embedId]
        );
        return existingEmbed.embedId;
    } else {
        // Create new embedding
        const embedId = randomString(16);
        await sql.execute(`
            INSERT INTO note_embeddings
            (embedId, noteId, providerId, modelId, dimension, embedding,
             dateCreated, utcDateCreated, dateModified, utcDateModified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [embedId, noteId, providerId, modelId, dimension, embeddingBlob,
             now, utcNow, now, utcNow]
        );
        return embedId;
    }
}

/**
 * Retrieves embedding for a specific note
 */
export async function getEmbeddingForNote(noteId: string, providerId: string, modelId: string): Promise<EmbeddingResult | null> {
    const row = await sql.getRow(`
        SELECT embedId, noteId, providerId, modelId, dimension, embedding, version,
               dateCreated, utcDateCreated, dateModified, utcDateModified
        FROM note_embeddings
        WHERE noteId = ? AND providerId = ? AND modelId = ?`,
        [noteId, providerId, modelId]
    );

    if (!row) {
        return null;
    }

    // Need to cast row to any as it doesn't have type information
    const rowData = row as any;

    return {
        ...rowData,
        embedding: bufferToEmbedding(rowData.embedding, rowData.dimension)
    };
}

/**
 * Finds similar notes based on vector similarity
 */
export async function findSimilarNotes(
    embedding: Float32Array,
    providerId: string,
    modelId: string,
    limit = 10,
    threshold = 0.65  // Slightly lowered from 0.7 to account for relationship focus
): Promise<{noteId: string, similarity: number}[]> {
    // Get all embeddings for the given provider and model
    const rows = await sql.getRows(`
        SELECT embedId, noteId, providerId, modelId, dimension, embedding
        FROM note_embeddings
        WHERE providerId = ? AND modelId = ?`,
        [providerId, modelId]
    );

    if (!rows.length) {
        return [];
    }

    // Calculate similarity for each embedding
    const similarities = rows.map(row => {
        const rowData = row as any;
        const rowEmbedding = bufferToEmbedding(rowData.embedding, rowData.dimension);
        return {
            noteId: rowData.noteId,
            similarity: cosineSimilarity(embedding, rowEmbedding)
        };
    });

    // Filter by threshold and sort by similarity (highest first)
    return similarities
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}

/**
 * Clean note content by removing HTML tags and normalizing whitespace
 */
function cleanNoteContent(content: string, type: string, mime: string): string {
    // If it's HTML content, remove HTML tags
    if ((type === 'text' && mime === 'text/html') || content.includes('<div>') || content.includes('<p>')) {
        // Simple tag removal - for more complex HTML parsing, consider using a proper HTML parser
        content = content.replace(/<[^>]*>/g, ' '); // Replace tags with a space
    }

    // Normalize whitespace (replace multiple spaces/newlines with single space)
    content = content.replace(/\s+/g, ' ');

    // Trim the content
    content = content.trim();

    // Truncate if extremely long (optional, adjust limit as needed)
    const MAX_CONTENT_LENGTH = 10000;
    if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + ' [content truncated]';
    }

    return content;
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
    if (note.type === 'text') {
        content = String(await note.getContent());
    } else if (note.type === 'code') {
        content = String(await note.getContent());
    } else if (note.type === 'image' || note.type === 'file') {
        content = `[${note.type} attachment: ${note.mime}]`;
    }

    // Clean the content to remove HTML tags and normalize whitespace
    content = cleanNoteContent(content, note.type, note.mime);

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

/**
 * Queues a note for embedding update
 */
export async function queueNoteForEmbedding(noteId: string, operation = 'UPDATE') {
    const now = dateUtils.localNowDateTime();
    const utcNow = dateUtils.utcNowDateTime();

    // Check if note is already in queue
    const existing = await sql.getValue(
        "SELECT 1 FROM embedding_queue WHERE noteId = ?",
        [noteId]
    );

    if (existing) {
        // Update existing queue entry
        await sql.execute(`
            UPDATE embedding_queue
            SET operation = ?, dateQueued = ?, utcDateQueued = ?, attempts = 0, error = NULL
            WHERE noteId = ?`,
            [operation, now, utcNow, noteId]
        );
    } else {
        // Add new queue entry
        await sql.execute(`
            INSERT INTO embedding_queue
            (noteId, operation, dateQueued, utcDateQueued)
            VALUES (?, ?, ?, ?)`,
            [noteId, operation, now, utcNow]
        );
    }
}

/**
 * Deletes all embeddings for a note
 */
export async function deleteNoteEmbeddings(noteId: string) {
    await sql.execute(
        "DELETE FROM note_embeddings WHERE noteId = ?",
        [noteId]
    );

    // Remove from queue if present
    await sql.execute(
        "DELETE FROM embedding_queue WHERE noteId = ?",
        [noteId]
    );
}

/**
 * Process the embedding queue
 */
export async function processEmbeddingQueue() {
    if (!(await options.getOptionBool('aiEnabled'))) {
        return;
    }

    const batchSize = parseInt(await options.getOption('embeddingBatchSize') || '10', 10);
    const enabledProviders = await getEnabledEmbeddingProviders();

    if (enabledProviders.length === 0) {
        return;
    }

    // Get notes from queue
    const notes = await sql.getRows(`
        SELECT noteId, operation, attempts
        FROM embedding_queue
        ORDER BY priority DESC, utcDateQueued ASC
        LIMIT ?`,
        [batchSize]
    );

    if (notes.length === 0) {
        return;
    }

    for (const note of notes) {
        try {
            const noteData = note as unknown as QueueItem;

            // Skip if note no longer exists
            if (!becca.getNote(noteData.noteId)) {
                await sql.execute(
                    "DELETE FROM embedding_queue WHERE noteId = ?",
                    [noteData.noteId]
                );
                await deleteNoteEmbeddings(noteData.noteId);
                continue;
            }

            if (noteData.operation === 'DELETE') {
                await deleteNoteEmbeddings(noteData.noteId);
                await sql.execute(
                    "DELETE FROM embedding_queue WHERE noteId = ?",
                    [noteData.noteId]
                );
                continue;
            }

            // Get note context for embedding
            const context = await getNoteEmbeddingContext(noteData.noteId);

            // Process with each enabled provider
            for (const provider of enabledProviders) {
                try {
                    // Generate embedding
                    const embedding = await provider.generateNoteEmbeddings(context);

                    // Store embedding
                    const config = provider.getConfig();
                    await storeNoteEmbedding(noteData.noteId, provider.name, config.model, embedding);
                } catch (providerError: any) {
                    log.error(`Error generating embedding with provider ${provider.name} for note ${noteData.noteId}: ${providerError.message || 'Unknown error'}`);
                }
            }

            // Remove from queue on success
            await sql.execute(
                "DELETE FROM embedding_queue WHERE noteId = ?",
                [noteData.noteId]
            );
        } catch (error: any) {
            const noteData = note as unknown as QueueItem;

            // Update attempt count and log error
            await sql.execute(`
                UPDATE embedding_queue
                SET attempts = attempts + 1,
                    lastAttempt = ?,
                    error = ?
                WHERE noteId = ?`,
                [dateUtils.utcNowDateTime(), error.message || 'Unknown error', noteData.noteId]
            );

            log.error(`Error processing embedding for note ${noteData.noteId}: ${error.message || 'Unknown error'}`);

            // Remove from queue if too many attempts
            if (noteData.attempts + 1 >= 3) {
                await sql.execute(
                    "DELETE FROM embedding_queue WHERE noteId = ?",
                    [noteData.noteId]
                );
                log.error(`Removed note ${noteData.noteId} from embedding queue after multiple failures`);
            }
        }
    }
}

/**
 * Set up event listeners for embedding-related events
 */
export function setupEmbeddingEventListeners() {
    // Listen for note content changes
    eventService.subscribe(eventService.NOTE_CONTENT_CHANGE, ({ entity }) => {
        if (entity && entity.noteId) {
            queueNoteForEmbedding(entity.noteId);
        }
    });

    // Listen for new notes
    eventService.subscribe(eventService.ENTITY_CREATED, ({ entityName, entity }) => {
        if (entityName === "notes" && entity && entity.noteId) {
            queueNoteForEmbedding(entity.noteId);
        }
    });

    // Listen for note title changes
    eventService.subscribe(eventService.NOTE_TITLE_CHANGED, ({ noteId }) => {
        if (noteId) {
            queueNoteForEmbedding(noteId);
        }
    });

    // Listen for note deletions
    eventService.subscribe(eventService.ENTITY_DELETED, ({ entityName, entityId }) => {
        if (entityName === "notes" && entityId) {
            queueNoteForEmbedding(entityId, 'DELETE');
        }
    });

    // Listen for attribute changes that might affect context
    eventService.subscribe(eventService.ENTITY_CHANGED, ({ entityName, entity }) => {
        if (entityName === "attributes" && entity && entity.noteId) {
            queueNoteForEmbedding(entity.noteId);
        }
    });
}

/**
 * Setup background processing of the embedding queue
 */
export async function setupEmbeddingBackgroundProcessing() {
    const interval = parseInt(await options.getOption('embeddingUpdateInterval') || '5000', 10);

    setInterval(async () => {
        try {
            await processEmbeddingQueue();
        } catch (error: any) {
            log.error(`Error in background embedding processing: ${error.message || 'Unknown error'}`);
        }
    }, interval);
}

/**
 * Initialize embeddings system
 */
export async function initEmbeddings() {
    if (await options.getOptionBool('aiEnabled')) {
        setupEmbeddingEventListeners();
        await setupEmbeddingBackgroundProcessing();
        log.info("Embeddings system initialized");
    } else {
        log.info("Embeddings system disabled");
    }
}

/**
 * Reprocess all notes to update embeddings
 */
export async function reprocessAllNotes() {
    if (!(await options.getOptionBool('aiEnabled'))) {
        return;
    }

    log.info("Queueing all notes for embedding updates");

    const noteIds = await sql.getColumn(
        "SELECT noteId FROM notes WHERE isDeleted = 0"
    );

    log.info(`Adding ${noteIds.length} notes to embedding queue`);

    for (const noteId of noteIds) {
        await queueNoteForEmbedding(noteId as string, 'UPDATE');
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
        "SELECT COUNT(*) FROM embedding_queue"
    ) as number;

    const failedNotesCount = await sql.getValue(
        "SELECT COUNT(*) FROM embedding_queue WHERE attempts > 0"
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
        ? Math.round((upToDateEmbeddings / totalNotesCount) * 100)
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

export default {
    cosineSimilarity,
    embeddingToBuffer,
    bufferToEmbedding,
    storeNoteEmbedding,
    getEmbeddingForNote,
    findSimilarNotes,
    getNoteEmbeddingContext,
    queueNoteForEmbedding,
    deleteNoteEmbeddings,
    processEmbeddingQueue,
    setupEmbeddingEventListeners,
    setupEmbeddingBackgroundProcessing,
    initEmbeddings,
    reprocessAllNotes,
    getEmbeddingStats
};
