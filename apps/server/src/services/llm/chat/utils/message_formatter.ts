/**
 * Message formatting utilities for different LLM providers
 */
import type { Message } from "../../ai_interface.js";

/**
 * Interface for message formatters
 */
interface MessageFormatter {
    formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[];
}

/**
 * Factory to get the appropriate message formatter for a given provider
 */
export function getFormatter(providerName: string): MessageFormatter {
    // Currently we use a simple implementation that works for most providers
    // In the future, this could be expanded to have provider-specific formatters
    return {
        formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[] {
            // Simple implementation that works for most providers
            const formattedMessages: Message[] = [];

            // Add system message if context or systemPrompt is provided
            if (context || systemPrompt) {
                formattedMessages.push({
                    role: 'system',
                    content: systemPrompt || (context ? `Use the following context to answer the query: ${context}` : '')
                });
            }

            // Add all other messages
            for (const message of messages) {
                if (message.role === 'system' && formattedMessages.some(m => m.role === 'system')) {
                    // Skip duplicate system messages
                    continue;
                }
                formattedMessages.push(message);
            }

            return formattedMessages;
        }
    };
}

/**
 * Build messages with context for a specific LLM provider
 */
export async function buildMessagesWithContext(
    messages: Message[],
    context: string,
    llmService: any
): Promise<Message[]> {
    try {
        if (!messages || messages.length === 0) {
            return [];
        }

        if (!context || context.trim() === '') {
            return messages;
        }

        // Get the provider name, handling service classes and raw provider names
        let providerName: string;
        if (typeof llmService === 'string') {
            // If llmService is a string, assume it's the provider name
            providerName = llmService;
        } else if (llmService.constructor && llmService.constructor.name) {
            // Extract provider name from service class name (e.g., OllamaService -> ollama)
            providerName = llmService.constructor.name.replace('Service', '').toLowerCase();
        } else {
            // Fallback to default
            providerName = 'default';
        }

        // Get the appropriate formatter for this provider
        const formatter = getFormatter(providerName);

        // Format messages with context using the provider-specific formatter
        const formattedMessages = formatter.formatMessages(
            messages,
            undefined, // No system prompt override - use what's in the messages
            context
        );

        return formattedMessages;
    } catch (error) {
        console.error(`Error building messages with context: ${error}`);
        // Fallback to original messages in case of error
        return messages;
    }
}

/**
 * Build context from a list of note sources and a query
 */
export function buildContextFromNotes(sources: any[], query: string): string {
    if (!sources || sources.length === 0) {
        return query || '';
    }

    const noteContexts = sources
        .filter(source => source.content) // Only include sources with content
        .map((source) => {
            // Format each note with its title as a natural heading and wrap in <note> tags
            return `<note>\n### ${source.title}\n${source.content || 'No content available'}\n</note>`;
        })
        .join('\n\n');

    if (!noteContexts) {
        return query || '';
    }

    // Import the CONTEXT_PROMPTS constant
    const { CONTEXT_PROMPTS } = require('../../constants/llm_prompt_constants.js');

    // Use the template from the constants file, replacing placeholders
    return CONTEXT_PROMPTS.CONTEXT_NOTES_WRAPPER
        .replace('{noteContexts}', noteContexts)
        .replace('{query}', query);
}
