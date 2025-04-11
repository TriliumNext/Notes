import type { NoteEmbeddingContext } from "./embeddings_interface.js";

/**
 * Type definition for embedding result
 */
export interface EmbeddingResult {
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

/**
 * Type for queue item
 */
export interface QueueItem {
    noteId: string;
    operation: string;
    attempts: number;
}

export type { NoteEmbeddingContext };
