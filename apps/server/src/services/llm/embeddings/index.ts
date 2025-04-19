// Re-export all modules for easy access
import * as vectorUtils from './vector_utils.js';
import * as storage from './storage.js';
import * as contentProcessing from './content_processing.js';
import * as queue from './queue.js';
// Import chunking dynamically to prevent circular dependencies
// import * as chunking from './chunking.js';
import * as events from './events.js';
import * as stats from './stats.js';
import * as indexOperations from './index_operations.js';
import { getChunkingOperations } from './chunking/chunking_interface.js';
import type { NoteEmbeddingContext } from './types.js';

// Export types
export * from './types.js';

// Maintain backward compatibility by exposing all functions at the top level
export const {
    cosineSimilarity,
    embeddingToBuffer,
    bufferToEmbedding,
    adaptEmbeddingDimensions,
    enhancedCosineSimilarity,
    selectOptimalEmbedding
} = vectorUtils;

export const {
    storeNoteEmbedding,
    getEmbeddingForNote,
    findSimilarNotes,
    deleteNoteEmbeddings
} = storage;

export const {
    getNoteEmbeddingContext,
    cleanNoteContent,
    extractStructuredContent
} = contentProcessing;

export const {
    queueNoteForEmbedding,
    getFailedEmbeddingNotes,
    retryFailedEmbedding,
    retryAllFailedEmbeddings,
    processEmbeddingQueue
} = queue;

// Export chunking function using the interface to break circular dependencies
export const processNoteWithChunking = async (
    noteId: string,
    provider: any,
    context: NoteEmbeddingContext
): Promise<void> => {
    const chunkingOps = await getChunkingOperations();
    return chunkingOps.processNoteWithChunking(noteId, provider, context);
};

export const {
    setupEmbeddingEventListeners,
    setupEmbeddingBackgroundProcessing,
    initEmbeddings
} = events;

export const {
    getEmbeddingStats,
    reprocessAllNotes,
    cleanupEmbeddings
} = stats;

export const {
    rebuildSearchIndex
} = indexOperations;

// Default export for backward compatibility
export default {
    // Vector utils
    cosineSimilarity: vectorUtils.cosineSimilarity,
    embeddingToBuffer: vectorUtils.embeddingToBuffer,
    bufferToEmbedding: vectorUtils.bufferToEmbedding,

    // Storage
    storeNoteEmbedding: storage.storeNoteEmbedding,
    getEmbeddingForNote: storage.getEmbeddingForNote,
    findSimilarNotes: storage.findSimilarNotes,
    deleteNoteEmbeddings: storage.deleteNoteEmbeddings,

    // Content processing
    getNoteEmbeddingContext: contentProcessing.getNoteEmbeddingContext,

    // Queue management
    queueNoteForEmbedding: queue.queueNoteForEmbedding,
    processEmbeddingQueue: queue.processEmbeddingQueue,
    getFailedEmbeddingNotes: queue.getFailedEmbeddingNotes,
    retryFailedEmbedding: queue.retryFailedEmbedding,
    retryAllFailedEmbeddings: queue.retryAllFailedEmbeddings,

    // Chunking - use the dynamic wrapper
    processNoteWithChunking,

    // Event handling
    setupEmbeddingEventListeners: events.setupEmbeddingEventListeners,
    setupEmbeddingBackgroundProcessing: events.setupEmbeddingBackgroundProcessing,
    initEmbeddings: events.initEmbeddings,

    // Stats and maintenance
    getEmbeddingStats: stats.getEmbeddingStats,
    reprocessAllNotes: stats.reprocessAllNotes,
    cleanupEmbeddings: stats.cleanupEmbeddings,

    // Index operations
    rebuildSearchIndex: indexOperations.rebuildSearchIndex
};
