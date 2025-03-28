import type { Message } from "../ai_interface.js";
// These imports need to be added for the factory to work
import { OpenAIMessageFormatter } from "../formatters/openai_formatter.js";
import { AnthropicMessageFormatter } from "../formatters/anthropic_formatter.js";
import { OllamaMessageFormatter } from "../formatters/ollama_formatter.js";

/**
 * Interface for provider-specific message formatters
 * This allows each provider to have custom formatting logic while maintaining a consistent interface
 */
export interface MessageFormatter {
    /**
     * Format messages for a specific LLM provider
     *
     * @param messages Array of messages to format
     * @param systemPrompt Optional system prompt to include
     * @param context Optional context to incorporate into messages
     * @returns Formatted messages ready to send to the provider
     */
    formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[];

    /**
     * Clean context content to prepare it for this specific provider
     *
     * @param content The raw context content
     * @returns Cleaned and formatted context content
     */
    cleanContextContent(content: string): string;

    /**
     * Get the maximum recommended context length for this provider
     *
     * @returns Maximum context length in characters
     */
    getMaxContextLength(): number;
}

/**
 * Factory to get the appropriate message formatter for a provider
 */
export class MessageFormatterFactory {
    // Cache formatters for reuse
    private static formatters: Record<string, MessageFormatter> = {};

    /**
     * Get the appropriate message formatter for a provider
     *
     * @param providerName Name of the LLM provider (e.g., 'openai', 'anthropic', 'ollama')
     * @returns MessageFormatter instance for the specified provider
     */
    static getFormatter(providerName: string): MessageFormatter {
        // Normalize provider name and handle variations
        let providerKey: string;

        // Normalize provider name from various forms (constructor.name, etc.)
        if (providerName.toLowerCase().includes('openai')) {
            providerKey = 'openai';
        } else if (providerName.toLowerCase().includes('anthropic') ||
                  providerName.toLowerCase().includes('claude')) {
            providerKey = 'anthropic';
        } else if (providerName.toLowerCase().includes('ollama')) {
            providerKey = 'ollama';
        } else {
            // Default to lowercase of whatever name we got
            providerKey = providerName.toLowerCase();
        }

        // Return cached formatter if available
        if (this.formatters[providerKey]) {
            return this.formatters[providerKey];
        }

        // Create and cache new formatter
        switch (providerKey) {
            case 'openai':
                this.formatters[providerKey] = new OpenAIMessageFormatter();
                break;
            case 'anthropic':
                this.formatters[providerKey] = new AnthropicMessageFormatter();
                break;
            case 'ollama':
                this.formatters[providerKey] = new OllamaMessageFormatter();
                break;
            default:
                // Default to OpenAI formatter for unknown providers
                console.warn(`No specific formatter for provider: ${providerName}. Using OpenAI formatter as default.`);
                this.formatters[providerKey] = new OpenAIMessageFormatter();
        }

        return this.formatters[providerKey];
    }
}
