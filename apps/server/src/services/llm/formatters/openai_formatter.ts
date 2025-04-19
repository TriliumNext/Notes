import sanitizeHtml from 'sanitize-html';
import type { Message } from '../ai_interface.js';
import { BaseMessageFormatter } from './base_formatter.js';
import { PROVIDER_PROMPTS, FORMATTING_PROMPTS } from '../constants/llm_prompt_constants.js';
import { LLM_CONSTANTS } from '../constants/provider_constants.js';
import {
    HTML_ALLOWED_TAGS,
    HTML_ALLOWED_ATTRIBUTES,
    HTML_TO_MARKDOWN_PATTERNS,
    HTML_ENTITY_REPLACEMENTS,
    FORMATTER_LOGS
} from '../constants/formatter_constants.js';

/**
 * OpenAI-specific message formatter
 * Optimized for OpenAI's API requirements and preferences
 */
export class OpenAIMessageFormatter extends BaseMessageFormatter {
    /**
     * Maximum recommended context length for OpenAI
     * Based on GPT-4 context window size
     */
    private static MAX_CONTEXT_LENGTH = LLM_CONSTANTS.CONTEXT_WINDOW.OPENAI;

    /**
     * Format messages for the OpenAI API
     */
    formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[] {
        const formattedMessages: Message[] = [];

        // Check if we already have a system message
        const hasSystemMessage = messages.some(msg => msg.role === 'system');
        const userAssistantMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

        // If we have explicit context, format it properly
        if (context) {
            // For OpenAI, it's best to put context in the system message
            const formattedContext = PROVIDER_PROMPTS.OPENAI.SYSTEM_WITH_CONTEXT(
                this.cleanContextContent(context)
            );

            // Add as system message
            formattedMessages.push({
                role: 'system',
                content: formattedContext
            });
        }
        // If we don't have explicit context but have a system prompt
        else if (!hasSystemMessage && systemPrompt) {
            formattedMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        // If neither context nor system prompt is provided, use default system prompt
        else if (!hasSystemMessage) {
            formattedMessages.push({
                role: 'system',
                content: this.getDefaultSystemPrompt(systemPrompt)
            });
        }
        // Otherwise if there are existing system messages, keep them
        else if (hasSystemMessage) {
            // Keep any existing system messages
            const systemMessages = messages.filter(msg => msg.role === 'system');
            for (const msg of systemMessages) {
                formattedMessages.push({
                    role: 'system',
                    content: this.cleanContextContent(msg.content)
                });
            }
        }

        // Add all user and assistant messages
        for (const msg of userAssistantMessages) {
            formattedMessages.push({
                role: msg.role,
                content: msg.content
            });
        }

        console.log(FORMATTER_LOGS.OPENAI.PROCESSED(messages.length, formattedMessages.length));
        return formattedMessages;
    }

    /**
     * Clean context content for OpenAI
     * OpenAI handles HTML better than Ollama but still benefits from some cleaning
     */
    cleanContextContent(content: string): string {
        if (!content) return '';

        try {
            // Convert HTML to Markdown for better readability
            const cleaned = sanitizeHtml(content, {
                allowedTags: HTML_ALLOWED_TAGS.STANDARD,
                allowedAttributes: HTML_ALLOWED_ATTRIBUTES.STANDARD
            });

            // Apply all HTML to Markdown patterns
            let markdown = cleaned;
            for (const pattern of Object.values(HTML_TO_MARKDOWN_PATTERNS)) {
                markdown = markdown.replace(pattern.pattern, pattern.replacement);
            }

            // Fix common HTML entities
            for (const pattern of Object.values(HTML_ENTITY_REPLACEMENTS)) {
                markdown = markdown.replace(pattern.pattern, pattern.replacement);
            }

            return markdown.trim();
        } catch (error) {
            console.error(FORMATTER_LOGS.ERROR.CONTEXT_CLEANING("OpenAI"), error);
            return content; // Return original if cleaning fails
        }
    }

    /**
     * Get the maximum recommended context length for OpenAI
     */
    getMaxContextLength(): number {
        return OpenAIMessageFormatter.MAX_CONTEXT_LENGTH;
    }
}
