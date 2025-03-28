import type { Message } from '../ai_interface.js';
import { BaseMessageFormatter } from './base_formatter.js';
import sanitizeHtml from 'sanitize-html';
import { PROVIDER_PROMPTS, FORMATTING_PROMPTS } from '../constants/llm_prompt_constants.js';
import { LLM_CONSTANTS } from '../constants/provider_constants.js';

/**
 * Ollama-specific message formatter
 * Handles the unique requirements of the Ollama API
 */
export class OllamaMessageFormatter extends BaseMessageFormatter {
    /**
     * Maximum recommended context length for Ollama
     * Smaller than other providers due to Ollama's handling of context
     */
    private static MAX_CONTEXT_LENGTH = LLM_CONSTANTS.CONTEXT_WINDOW.OLLAMA;

    /**
     * Format messages for the Ollama API
     */
    formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[] {
        const formattedMessages: Message[] = [];

        // First identify user and system messages
        const systemMessages = messages.filter(msg => msg.role === 'system');
        const userMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

        // Create base system message with instructions or use default
        const basePrompt = systemPrompt || PROVIDER_PROMPTS.COMMON.DEFAULT_ASSISTANT_INTRO;

        // Always add a system message with the base prompt
        formattedMessages.push({
            role: 'system',
            content: basePrompt
        });

        // If we have context, inject it into the first user message
        if (context && userMessages.length > 0) {
            let injectedContext = false;

            for (let i = 0; i < userMessages.length; i++) {
                const msg = userMessages[i];

                if (msg.role === 'user' && !injectedContext) {
                    // Simple context injection directly in the user's message
                    const cleanedContext = this.cleanContextContent(context);
                    const formattedContext = PROVIDER_PROMPTS.OLLAMA.CONTEXT_INJECTION(
                        cleanedContext,
                        msg.content
                    );

                    formattedMessages.push({
                        role: 'user',
                        content: formattedContext
                    });

                    injectedContext = true;
                } else {
                    formattedMessages.push(msg);
                }
            }
        } else {
            // No context, just add all messages as-is
            for (const msg of userMessages) {
                formattedMessages.push(msg);
            }
        }

        console.log(`Ollama formatter processed ${messages.length} messages into ${formattedMessages.length} messages`);

        return formattedMessages;
    }

    /**
     * Clean up HTML and other problematic content before sending to Ollama
     * Ollama needs a more aggressive cleaning than other models
     */
    override cleanContextContent(content: string): string {
        if (!content) return '';

        try {
            // First use the parent class to do standard cleaning
            let sanitized = super.cleanContextContent(content);

            // Then apply Ollama-specific aggressive cleaning
            // Remove any remaining HTML using sanitizeHtml
            let plaintext = sanitizeHtml(sanitized, {
                allowedTags: [],
                allowedAttributes: {},
                textFilter: (text) => text
            });

            // Then aggressively sanitize to plain ASCII and simple formatting
            plaintext = plaintext
                // Replace common problematic quotes with simple ASCII quotes
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                // Replace other common Unicode characters
                .replace(/[–—]/g, '-')
                .replace(/[•]/g, '*')
                .replace(/[…]/g, '...')
                // Strip all non-ASCII characters
                .replace(/[^\x00-\x7F]/g, '')
                // Normalize whitespace
                .replace(/\s+/g, ' ')
                .replace(/\n\s+/g, '\n')
                .trim();

            return plaintext;
        } catch (error) {
            console.error("Error cleaning context content for Ollama:", error);
            return content; // Return original if cleaning fails
        }
    }

    /**
     * Get the maximum recommended context length for Ollama
     */
    getMaxContextLength(): number {
        return OllamaMessageFormatter.MAX_CONTEXT_LENGTH;
    }
}
