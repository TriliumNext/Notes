import type { Message } from '../ai_interface.js';

/**
 * Interface for model capabilities information
 */
export interface ModelCapabilities {
    contextWindowTokens: number;  // Context window size in tokens
    contextWindowChars: number;   // Estimated context window size in characters (for planning)
    maxCompletionTokens: number;  // Maximum completion length
    hasFunctionCalling: boolean;  // Whether the model supports function calling
    hasVision: boolean;           // Whether the model supports image input
    costPerInputToken: number;    // Cost per input token (if applicable)
    costPerOutputToken: number;   // Cost per output token (if applicable)
}

/**
 * Default model capabilities for unknown models
 */
export const DEFAULT_MODEL_CAPABILITIES: ModelCapabilities = {
    contextWindowTokens: 8192,
    contextWindowChars: 16000,  // ~4 chars per token estimate
    maxCompletionTokens: 1024,
    hasFunctionCalling: false,
    hasVision: false,
    costPerInputToken: 0,
    costPerOutputToken: 0
};

/**
 * Model capabilities for common models
 */
export const MODEL_CAPABILITIES: Record<string, Partial<ModelCapabilities>> = {
    // OpenAI models
    'gpt-3.5-turbo': {
        contextWindowTokens: 8192,
        contextWindowChars: 16000,
        hasFunctionCalling: true
    },
    'gpt-3.5-turbo-16k': {
        contextWindowTokens: 16384,
        contextWindowChars: 65000,
        hasFunctionCalling: true
    },
    'gpt-4': {
        contextWindowTokens: 8192,
        contextWindowChars: 32000,
        hasFunctionCalling: true
    },
    'gpt-4-32k': {
        contextWindowTokens: 32768,
        contextWindowChars: 130000,
        hasFunctionCalling: true
    },
    'gpt-4-turbo': {
        contextWindowTokens: 128000,
        contextWindowChars: 512000,
        hasFunctionCalling: true,
        hasVision: true
    },
    'gpt-4o': {
        contextWindowTokens: 128000,
        contextWindowChars: 512000,
        hasFunctionCalling: true,
        hasVision: true
    },

    // Anthropic models
    'claude-3-haiku': {
        contextWindowTokens: 200000,
        contextWindowChars: 800000,
        hasVision: true
    },
    'claude-3-sonnet': {
        contextWindowTokens: 200000,
        contextWindowChars: 800000,
        hasVision: true
    },
    'claude-3-opus': {
        contextWindowTokens: 200000,
        contextWindowChars: 800000,
        hasVision: true
    },
    'claude-2': {
        contextWindowTokens: 100000,
        contextWindowChars: 400000
    },

    // Ollama models (defaults, will be updated dynamically)
    'llama3': {
        contextWindowTokens: 8192,
        contextWindowChars: 32000
    },
    'mistral': {
        contextWindowTokens: 8192,
        contextWindowChars: 32000
    },
    'llama2': {
        contextWindowTokens: 8192,
        contextWindowChars: 16000
    }
};

/**
 * Calculate available context window size for context generation
 * This takes into account expected message sizes and other overhead
 *
 * @param model Model name
 * @param messages Current conversation messages
 * @param expectedTurns Number of expected additional conversation turns
 * @returns Available context size in characters
 */
export function calculateAvailableContextSize(
    modelCapabilities: ModelCapabilities,
    messages: Message[],
    expectedTurns: number = 3
): number {
    // Calculate current message token usage (rough estimate)
    let currentMessageChars = 0;
    for (const message of messages) {
        currentMessageChars += message.content.length;
    }

    // Reserve space for system prompt and overhead
    const systemPromptReserve = 1000;

    // Reserve space for expected conversation turns
    const turnReserve = expectedTurns * 2000; // Average 2000 chars per turn (including both user and assistant)

    // Calculate available space
    const totalReserved = currentMessageChars + systemPromptReserve + turnReserve;
    const availableContextSize = Math.max(0, modelCapabilities.contextWindowChars - totalReserved);

    // Use at most 70% of total context window size to be safe
    const maxSafeContextSize = Math.floor(modelCapabilities.contextWindowChars * 0.7);

    // Return the smaller of available size or max safe size
    return Math.min(availableContextSize, maxSafeContextSize);
}
