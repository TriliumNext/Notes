import { LLMProvider } from '../llm_interface.js';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';

export class OpenAIProvider implements LLMProvider {
    name = 'openai';
    private client: ChatOpenAI | null = null;
    private embeddings: OpenAIEmbeddings | null = null;
    private apiKey: string | null = null;

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
        this.client = new ChatOpenAI({
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
            openAIApiKey: apiKey
        });
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: apiKey
        });
    }

    async generateEmbeddings(text: string): Promise<Float32Array> {
        if (!this.embeddings) {
            throw new Error('OpenAI API key not configured');
        }
        const embeddings = await this.embeddings.embedQuery(text);
        return Float32Array.from(embeddings);
    }

    async chat(messages: Array<{role: string, content: string}>, context?: string): Promise<string> {
        if (!this.client) {
            throw new Error('OpenAI API key not configured');
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
