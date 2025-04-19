import options from '../options.js';
import type { AIService, ChatCompletionOptions, ChatResponse, Message } from './ai_interface.js';
import { DEFAULT_SYSTEM_PROMPT } from './constants/llm_prompt_constants.js';

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
        // Use prompt from constants file if no custom prompt is provided
        return customPrompt || DEFAULT_SYSTEM_PROMPT;
    }
}
