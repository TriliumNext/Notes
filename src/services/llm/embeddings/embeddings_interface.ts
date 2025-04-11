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
 * Information about an embedding model's capabilities
 */
export interface EmbeddingModelInfo {
    dimension: number;
    contextWindow: number;
    /**
     * Whether the model guarantees normalized vectors (unit length)
     */
    guaranteesNormalization: boolean;
}

/**
 * Normalization status of a provider's embeddings
 */
export enum NormalizationStatus {
    /**
     * Provider guarantees all embeddings are normalized to unit vectors
     */
    GUARANTEED = 'guaranteed',

    /**
     * Provider does not guarantee normalization, but embeddings are usually normalized
     */
    USUALLY = 'usually',

    /**
     * Provider does not guarantee normalization, embeddings must be normalized before use
     */
    NEVER = 'never',

    /**
     * Normalization status is unknown and should be checked at runtime
     */
    UNKNOWN = 'unknown'
}

/**
 * Configuration for how embeddings should be generated
 */
export interface EmbeddingConfig {
    model: string;
    dimension: number;
    type: 'float32' | 'float64';
    /**
     * Whether embeddings should be normalized before use
     * If true, normalization will always be applied
     * If false, normalization depends on provider's status
     */
    normalize?: boolean;
    /**
     * The normalization status of this provider
     */
    normalizationStatus?: NormalizationStatus;
    batchSize?: number;
    contextWindowSize?: number;
    apiKey?: string;
    baseUrl?: string;
}

/**
 * Core interface that all embedding providers must implement
 */
export interface EmbeddingProvider {
    name: string;
    getConfig(): EmbeddingConfig;

    /**
     * Returns information about the normalization status of this provider
     */
    getNormalizationStatus(): NormalizationStatus;

    /**
     * Verify that embeddings are properly normalized
     * @returns true if embeddings are properly normalized
     */
    verifyNormalization?(sample?: Float32Array): Promise<boolean>;

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
