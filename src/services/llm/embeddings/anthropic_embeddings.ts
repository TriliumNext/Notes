import type { LLMProvider, EmbeddingConfig } from '../llm_interface.js';
import { ChatAnthropic } from '@langchain/anthropic';
import { OpenAIEmbeddings } from '@langchain/openai';  // We'll use OpenAI for embeddings since Anthropic doesn't have an embeddings API yet

export class AnthropicProvider implements LLMProvider {
    name = 'anthropic';
    private client: ChatAnthropic | null = null;
    private embeddings: OpenAIEmbeddings | null = null;
    private config: EmbeddingConfig;

    constructor(options: {
        anthropicApiKey: string,
        openaiApiKey: string,  // Required for embeddings
        model?: string,
        embeddingModel?: string
    }) {
        const {
            anthropicApiKey,
            openaiApiKey,
            model = 'claude-3-opus-20240229',
            embeddingModel = 'text-embedding-3-small'
        } = options;

        this.client = new ChatAnthropic({
            modelName: model,
            temperature: 0.7,
            anthropicApiKey: anthropicApiKey
        });

        // Use OpenAI for embeddings since Anthropic doesn't have an embeddings API
        this.embeddings = new OpenAIEmbeddings({
            modelName: embeddingModel,
            openAIApiKey: openaiApiKey
        });

        // Using OpenAI's text-embedding-3-small which has 1536 dimensions
        this.config = {
            model: embeddingModel,
            dimension: 1536,
            type: 'float32',
            normalize: true,
            batchSize: 100
        };
    }

    getConfig(): EmbeddingConfig {
        return this.config;
    }

    async generateEmbeddings(text: string): Promise<Float32Array> {
        if (!this.embeddings) {
            throw new Error('Embeddings not configured');
        }
        const embeddings = await this.embeddings.embedQuery(text);
        return Float32Array.from(embeddings);
    }

    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (!this.embeddings) {
            throw new Error('Embeddings not configured');
        }
        const embeddings = await this.embeddings.embedDocuments(texts);
        return embeddings.map((e: number[]) => Float32Array.from(e));
    }

    async chat(messages: Array<{role: string, content: string}>, context?: string): Promise<string> {
        if (!this.client) {
            throw new Error('Anthropic client not configured');
        }

        const systemMessage = context ? 
            `You are a helpful assistant. Use the following context to answer questions:\n\n${context}` :
            'You are a helpful assistant.';

        const response = await this.client.invoke([
            { role: 'system', content: systemMessage },
            ...messages.map(m => ({ role: m.role as any, content: m.content }))
        ]);

        return response.content.toString();
    }
} 