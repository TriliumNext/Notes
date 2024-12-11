import { LLMProvider } from '../llm_interface.js';
import { Ollama } from '@langchain/community/llms/ollama';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';

export class OllamaProvider implements LLMProvider {
    name = 'ollama';
    private client: Ollama;
    private embeddings: OllamaEmbeddings;

    constructor() {
        this.client = new Ollama({
            model: 'llama2',
            baseUrl: 'http://localhost:11434'
        });
        this.embeddings = new OllamaEmbeddings({
            model: 'llama2',
            baseUrl: 'http://localhost:11434'
        });
    }

    async generateEmbeddings(text: string): Promise<Float32Array> {
        const embeddings = await this.embeddings.embedQuery(text);
        return Float32Array.from(embeddings);
    }

    async chat(messages: Array<{role: string, content: string}>, context?: string): Promise<string> {
        const prompt = context
            ? `Context:\n${context}\n\nChat History:\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
            : messages.map(m => `${m.role}: ${m.content}`).join('\n');

        const response = await this.client.invoke(prompt);
        return response;
    }
}
