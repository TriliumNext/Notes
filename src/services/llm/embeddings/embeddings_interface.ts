import type { NoteType, AttributeType } from "../../../becca/entities/rows.js";

/**
 * Represents the context of a note that will be embedded
 */
export interface NoteEmbeddingContext {
    noteId: string;
    title: string;
    content: string;
    type: NoteType;
    mime: string;
    dateCreated: string;
    dateModified: string;
    attributes: {
        type: AttributeType;
        name: string;
        value: string;
    }[];
    parentTitles: string[];
    childTitles: string[];
    attachments: {
        title: string;
        mime: string;
    }[];
    backlinks?: {
        sourceNoteId: string;
        sourceTitle: string;
        relationName: string;
    }[];
    relatedNotes?: {
        targetNoteId: string;
        targetTitle: string;
        relationName: string;
    }[];
    labelValues?: Record<string, string>;
    templateTitles?: string[];
}

/**
 * Configuration for how embeddings should be generated
 */
export interface EmbeddingConfig {
    model: string;
    dimension: number;
    type: 'float32' | 'float64';
    normalize?: boolean;
    batchSize?: number;
    contextWindowSize?: number;
}

/**
 * Core interface that all embedding providers must implement
 */
export interface EmbeddingProvider {
    name: string;
    getConfig(): EmbeddingConfig;

    /**
     * Generate embeddings for a single piece of text
     */
    generateEmbeddings(text: string): Promise<Float32Array>;

    /**
     * Generate embeddings for multiple pieces of text in batch
     */
    generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]>;

    /**
     * Generate embeddings for a note with its full context
     */
    generateNoteEmbeddings(context: NoteEmbeddingContext): Promise<Float32Array>;

    /**
     * Generate embeddings for multiple notes with their contexts in batch
     */
    generateBatchNoteEmbeddings(contexts: NoteEmbeddingContext[]): Promise<Float32Array[]>;
}
