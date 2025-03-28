/**
 * Interface for embedding provider configuration
 */
export interface EmbeddingProviderConfig {
  name: string;
  model: string;
  dimension: number;
  type: 'float32' | 'int8' | 'uint8' | 'float16';
  enabled?: boolean;
  priority?: number;
  baseUrl?: string;
  apiKey?: string;
  contextWidth?: number;
  batchSize?: number;
}

/**
 * Interface for embedding model information
 */
export interface EmbeddingModelInfo {
  name: string;
  dimension: number;
  contextWidth?: number;
  maxBatchSize?: number;
  tokenizer?: string;
  type: 'float32' | 'int8' | 'uint8' | 'float16';
}

/**
 * Interface for embedding provider
 */
export interface EmbeddingProvider {
  getName(): string;
  getModel(): string;
  getDimension(): number;
  getType(): 'float32' | 'int8' | 'uint8' | 'float16';
  isEnabled(): boolean;
  getPriority(): number;
  getMaxBatchSize(): number;
  generateEmbedding(text: string): Promise<Float32Array>;
  generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]>;
  initialize(): Promise<void>;
}

/**
 * Interface for embedding process result
 */
export interface EmbeddingProcessResult {
  noteId: string;
  title: string;
  success: boolean;
  message?: string;
  error?: Error;
  chunks?: number;
}

/**
 * Interface for embedding queue item
 */
export interface EmbeddingQueueItem {
  id: number;
  noteId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  provider: string;
  model: string;
  dimension: number;
  type: string;
  attempts: number;
  lastAttempt: string | null;
  dateCreated: string;
  dateCompleted: string | null;
  error: string | null;
  chunks: number;
}

/**
 * Interface for embedding batch processing
 */
export interface EmbeddingBatch {
  texts: string[];
  noteIds: string[];
  indexes: number[];
}

/**
 * Interface for embedding search result
 */
export interface EmbeddingSearchResult {
  noteId: string;
  similarity: number;
  title?: string;
  content?: string;
  parentId?: string;
  parentTitle?: string;
  dateCreated?: string;
  dateModified?: string;
}

/**
 * Interface for embedding chunk
 */
export interface EmbeddingChunk {
  id: number;
  noteId: string;
  content: string;
  embedding: Float32Array | Int8Array | Uint8Array;
  metadata?: Record<string, unknown>;
}
