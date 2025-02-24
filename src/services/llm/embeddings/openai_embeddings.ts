import type { LLMProvider, EmbeddingConfig } from '../llm_interface.js';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

export class OpenAIProvider implements LLMProvider {
    name = 'openai';
    private client: ChatOpenAI | null = null;
    private embeddings: OpenAIEmbeddings | null = null;
    private config: EmbeddingConfig;

    constructor(options: {
        apiKey: string,
        model?: string,
        embeddingModel?: string
    }) {
        const {
            apiKey,
            model = 'gpt-3.5-turbo',
            embeddingModel = 'text-embedding-3-small'
        } = options;

        this.client = new ChatOpenAI({
            modelName: model,
            temperature: 0.7,
            openAIApiKey: apiKey
        });

        this.embeddings = new OpenAIEmbeddings({
            modelName: embeddingModel,
            openAIApiKey: apiKey
        });

        // text-embedding-3-small uses 1536-dimensional embeddings
        this.config = {
            model: embeddingModel,
            dimension: 1536,
            type: 'float32',
            normalize: true,
            batchSize: 100  // OpenAI allows larger batches
        };
    }

    getConfig(): EmbeddingConfig {
        return this.config;
    }

    async generateEmbeddings(text: string): Promise<Float32Array> {
        if (!this.embeddings) {
            throw new Error('OpenAI embeddings not configured');
        }
        const embeddings = await this.embeddings.embedQuery(text);
        return Float32Array.from(embeddings);
    }

    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (!this.embeddings) {
            throw new Error('OpenAI embeddings not configured');
        }
        const embeddings = await this.embeddings.embedDocuments(texts);
        return embeddings.map((e: number[]) => Float32Array.from(e));
    }

    async chat(messages: Array<{role: string, content: string}>, context?: string): Promise<string> {
        if (!this.client) {
            throw new Error('OpenAI client not configured');
        }

        const systemMessage = {
            role: 'system',
            content: context ? 
                `You are a helpful assistant. Use the following context to answer questions:\n\n${context}` :
                'You are a helpful assistant.'
        };

        const response = await this.client.invoke([
            systemMessage,
            ...messages.map(m => ({ role: m.role as any, content: m.content }))
        ]);

        return response.content.toString();
    }
} 