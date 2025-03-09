export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

// Interface for streaming response chunks
export interface StreamChunk {
    text: string;
    done: boolean;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

export interface ChatCompletionOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    stream?: boolean; // Whether to stream the response
}

export interface ChatResponse {
    text: string;
    model: string;
    provider: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    // Stream handler - only present when streaming is enabled
    stream?: (callback: (chunk: StreamChunk) => Promise<void> | void) => Promise<string>;
}

export interface AIService {
    /**
     * Generate a chat completion response
     */
    generateChatCompletion(messages: Message[], options?: ChatCompletionOptions): Promise<ChatResponse>;

    /**
     * Check if the service can be used (API key is set, etc.)
     */
    isAvailable(): boolean;

    /**
     * Get the name of the service
     */
    getName(): string;
}
