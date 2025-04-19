import type { Message } from '../../ai_interface.js';
import { MESSAGE_FORMATTER_TEMPLATES, PROVIDER_IDENTIFIERS } from '../../constants/formatter_constants.js';

/**
 * Interface for message formatters that handle provider-specific message formatting
 */
export interface MessageFormatter {
    /**
     * Format messages with system prompt and context in provider-specific way
     * @param messages Original messages
     * @param systemPrompt Optional system prompt to override
     * @param context Optional context to include
     * @param preserveSystemPrompt Optional flag to preserve existing system prompt
     * @returns Formatted messages optimized for the specific provider
     */
    formatMessages(messages: Message[], systemPrompt?: string, context?: string, preserveSystemPrompt?: boolean): Message[];
}

/**
 * Base message formatter with common functionality
 */
export abstract class BaseMessageFormatter implements MessageFormatter {
    /**
     * Format messages with system prompt and context
     * Each provider should override this method with their specific formatting strategy
     */
    abstract formatMessages(messages: Message[], systemPrompt?: string, context?: string, preserveSystemPrompt?: boolean): Message[];

    /**
     * Helper method to extract existing system message from messages
     */
    protected getSystemMessage(messages: Message[]): Message | undefined {
        return messages.find(msg => msg.role === 'system');
    }

    /**
     * Helper method to create a copy of messages without system message
     */
    protected getMessagesWithoutSystem(messages: Message[]): Message[] {
        return messages.filter(msg => msg.role !== 'system');
    }
}

/**
 * OpenAI-specific message formatter
 * Optimizes message format for OpenAI models (GPT-3.5, GPT-4, etc.)
 */
export class OpenAIMessageFormatter extends BaseMessageFormatter {
    formatMessages(messages: Message[], systemPrompt?: string, context?: string, preserveSystemPrompt?: boolean): Message[] {
        const formattedMessages: Message[] = [];

        // OpenAI performs best with system message first, then context as a separate system message
        // or appended to the original system message

        // Handle system message
        const existingSystem = this.getSystemMessage(messages);

        if (preserveSystemPrompt && existingSystem) {
            // Use the existing system message
            formattedMessages.push(existingSystem);
        } else if (systemPrompt || existingSystem) {
            const systemContent = systemPrompt || existingSystem?.content || '';
            formattedMessages.push({
                role: 'system',
                content: systemContent
            });
        }

        // Add context as a system message with clear instruction
        if (context) {
            formattedMessages.push({
                role: 'system',
                content: MESSAGE_FORMATTER_TEMPLATES.OPENAI.CONTEXT_INSTRUCTION + context
            });
        }

        // Add remaining messages (excluding system)
        formattedMessages.push(...this.getMessagesWithoutSystem(messages));

        return formattedMessages;
    }
}

/**
 * Anthropic-specific message formatter
 * Optimizes message format for Claude models
 */
export class AnthropicMessageFormatter extends BaseMessageFormatter {
    formatMessages(messages: Message[], systemPrompt?: string, context?: string, preserveSystemPrompt?: boolean): Message[] {
        const formattedMessages: Message[] = [];

        // Anthropic performs best with a specific XML-like format for context and system instructions

        // Create system message with combined prompt and context if any
        let systemContent = '';
        const existingSystem = this.getSystemMessage(messages);

        if (preserveSystemPrompt && existingSystem) {
            systemContent = existingSystem.content;
        } else if (systemPrompt || existingSystem) {
            systemContent = systemPrompt || existingSystem?.content || '';
        }

        // For Claude, wrap context in XML tags for clear separation
        if (context) {
            systemContent += MESSAGE_FORMATTER_TEMPLATES.ANTHROPIC.CONTEXT_START + context + MESSAGE_FORMATTER_TEMPLATES.ANTHROPIC.CONTEXT_END;
        }

        // Add system message if we have content
        if (systemContent) {
            formattedMessages.push({
                role: 'system',
                content: systemContent
            });
        }

        // Add remaining messages (excluding system)
        formattedMessages.push(...this.getMessagesWithoutSystem(messages));

        return formattedMessages;
    }
}

/**
 * Ollama-specific message formatter
 * Optimizes message format for open-source models
 */
export class OllamaMessageFormatter extends BaseMessageFormatter {
    formatMessages(messages: Message[], systemPrompt?: string, context?: string, preserveSystemPrompt?: boolean): Message[] {
        const formattedMessages: Message[] = [];

        // Ollama format is closer to raw prompting and typically works better with
        // context embedded in system prompt rather than as separate messages

        // Build comprehensive system prompt
        let systemContent = '';
        const existingSystem = this.getSystemMessage(messages);

        if (systemPrompt || existingSystem) {
            systemContent = systemPrompt || existingSystem?.content || '';
        }

        // Add context to system prompt
        if (context) {
            systemContent += MESSAGE_FORMATTER_TEMPLATES.OLLAMA.REFERENCE_INFORMATION + context;
        }

        // Add system message if we have content
        if (systemContent) {
            formattedMessages.push({
                role: 'system',
                content: systemContent
            });
        }

        // Add remaining messages (excluding system)
        formattedMessages.push(...this.getMessagesWithoutSystem(messages));

        return formattedMessages;
    }
}

/**
 * Default message formatter when provider is unknown
 */
export class DefaultMessageFormatter extends BaseMessageFormatter {
    formatMessages(messages: Message[], systemPrompt?: string, context?: string, preserveSystemPrompt?: boolean): Message[] {
        const formattedMessages: Message[] = [];

        // Handle system message
        const existingSystem = this.getSystemMessage(messages);

        if (preserveSystemPrompt && existingSystem) {
            formattedMessages.push(existingSystem);
        } else if (systemPrompt || existingSystem) {
            const systemContent = systemPrompt || existingSystem?.content || '';
            formattedMessages.push({
                role: 'system',
                content: systemContent
            });
        }

        // Add context as a user message
        if (context) {
            formattedMessages.push({
                role: 'user',
                content: MESSAGE_FORMATTER_TEMPLATES.DEFAULT.CONTEXT_INSTRUCTION + context
            });
        }

        // Add user/assistant messages
        formattedMessages.push(...this.getMessagesWithoutSystem(messages));

        return formattedMessages;
    }
}

/**
 * Factory for creating the appropriate message formatter based on provider
 */
export class MessageFormatterFactory {
    private static formatters: Record<string, MessageFormatter> = {
        [PROVIDER_IDENTIFIERS.OPENAI]: new OpenAIMessageFormatter(),
        [PROVIDER_IDENTIFIERS.ANTHROPIC]: new AnthropicMessageFormatter(),
        [PROVIDER_IDENTIFIERS.OLLAMA]: new OllamaMessageFormatter(),
        [PROVIDER_IDENTIFIERS.DEFAULT]: new DefaultMessageFormatter()
    };

    /**
     * Get the appropriate formatter for a provider
     * @param provider Provider name
     * @returns Message formatter for that provider
     */
    static getFormatter(provider: string): MessageFormatter {
        return this.formatters[provider] || this.formatters[PROVIDER_IDENTIFIERS.DEFAULT];
    }

    /**
     * Register a custom formatter for a provider
     * @param provider Provider name
     * @param formatter Custom formatter implementation
     */
    static registerFormatter(provider: string, formatter: MessageFormatter): void {
        this.formatters[provider] = formatter;
    }
}
