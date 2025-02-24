import type { LLMProvider, EmbeddingConfig } from '../llm_interface.js';
import { Ollama } from '@langchain/community/llms/ollama';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

export class OllamaProvider implements LLMProvider {
    name = 'ollama';
    private client: Ollama;
    private embeddings: OllamaEmbeddings;
    private config: EmbeddingConfig;

    constructor(options: {
        model?: string,
        baseUrl?: string,
        embeddingModel?: string
    } = {}) {
        const {
            model = 'llama2',
            baseUrl = 'http://localhost:11434',
            embeddingModel = 'nomic-embed-text'  // A good default for embeddings
        } = options;

        this.client = new Ollama({
            model,
            baseUrl
        });

        this.embeddings = new OllamaEmbeddings({
            model: embeddingModel,
            baseUrl
        });

        // nomic-embed-text uses 768-dimensional embeddings
        this.config = {
            model: embeddingModel,
            dimension: 768,
            type: 'float32',
            normalize: true,
            batchSize: 10
        };
    }

    getConfig(): EmbeddingConfig {
        return this.config;
    }

    async generateEmbeddings(text: string): Promise<Float32Array> {
        const embeddings = await this.embeddings.embedQuery(text);
        return Float32Array.from(embeddings);
    }

    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        const embeddings = await this.embeddings.embedDocuments(texts);
        return embeddings.map((e: number[]) => Float32Array.from(e));
    }

    async chat(messages: Array<{role: string, content: string}>, context?: string): Promise<string> {
        const prompt = context
            ? `Context:\n${context}\n\nChat History:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
            : messages.map(m => `${m.role}: ${m.content}`).join('\n');

        const response = await this.client.invoke(prompt);
        return response;
    }
} 