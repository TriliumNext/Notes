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
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    showThinking?: boolean;
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

/**
 * Interface for the semantic context service, which provides enhanced context retrieval
 * for AI conversations based on semantic similarity.
 */
export interface SemanticContextService {
    /**
     * Initialize the semantic context service
     */
    initialize(): Promise<void>;

    /**
     * Retrieve semantic context based on relevance to user query
     */
    getSemanticContext(noteId: string, userQuery: string, maxResults?: number): Promise<string>;

    /**
     * Get progressive context based on depth
     */
    getProgressiveContext?(noteId: string, depth?: number): Promise<string>;

    /**
     * Get smart context selection that adapts to query complexity
     */
    getSmartContext?(noteId: string, userQuery: string): Promise<string>;

    /**
     * Enhance LLM context with agent tools
     */
    getAgentToolsContext(noteId: string, query: string, showThinking?: boolean): Promise<string>;
}
