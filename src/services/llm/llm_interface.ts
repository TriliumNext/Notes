export interface LLMProvider {
    name: string;
    generateEmbeddings(text: string): Promise<Float32Array>;
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
