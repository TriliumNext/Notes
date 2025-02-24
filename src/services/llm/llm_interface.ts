export interface EmbeddingConfig {
    model: string;
    dimension: number;
    type: 'float32' | 'float64';
    normalize?: boolean;
    batchSize?: number;
}

export interface VectorSimilarityResult {
    noteId: string;
    similarity: number;
    title?: string;
    snippet?: string;
}

export interface EmbeddingProvider {
    name: string;
    getConfig(): EmbeddingConfig;
    generateEmbeddings(text: string): Promise<Float32Array>;
    generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]>;
}

export interface LLMProvider extends EmbeddingProvider {
    chat(messages: Array<{role: string, content: string}>, context?: string): Promise<string>;
}

export interface LLMConfig {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    enabled?: boolean;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

export interface ChatContext {
    noteIds?: string[];
    searchQuery?: string;
    maxResults?: number;
}
