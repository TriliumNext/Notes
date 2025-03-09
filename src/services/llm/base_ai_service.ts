import options from '../options.js';
import type { AIService, ChatCompletionOptions, ChatResponse, Message } from './ai_interface.js';

export abstract class BaseAIService implements AIService {
    protected name: string;

    constructor(name: string) {
        this.name = name;
    }

    abstract generateChatCompletion(messages: Message[], options?: ChatCompletionOptions): Promise<ChatResponse>;

    isAvailable(): boolean {
        return options.getOptionBool('aiEnabled'); // Base check if AI is enabled globally
    }

    getName(): string {
        return this.name;
    }

    protected getSystemPrompt(customPrompt?: string): string {
        // Default system prompt if none is provided
        return customPrompt ||
            "You are a helpful assistant embedded in the Trilium Notes application. " +
            "You can help users with their notes, answer questions, and provide information. " +
            "Keep your responses concise and helpful. " +
            "You're currently chatting with the user about their notes.";
    }
}
