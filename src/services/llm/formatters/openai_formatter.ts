import sanitizeHtml from 'sanitize-html';
import type { Message } from '../ai_interface.js';
import { BaseMessageFormatter } from './base_formatter.js';
import { PROVIDER_PROMPTS, FORMATTING_PROMPTS } from '../constants/llm_prompt_constants.js';
import { LLM_CONSTANTS } from '../constants/provider_constants.js';

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

        console.log(`OpenAI formatter: ${messages.length} messages → ${formattedMessages.length} messages`);
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
                allowedTags: FORMATTING_PROMPTS.HTML_ALLOWED_TAGS,
                allowedAttributes: {
                    'a': ['href']
                },
                transformTags: {
                    'h1': 'h2',
                    'h2': 'h3',
                    'div': 'p',
                    'span': 'span'
                }
            });

            // Process inline elements to markdown with simpler approach
            let markdown = cleaned
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
                .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
                .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
                .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                .replace(/<br[^>]*>/gi, '\n')
                .replace(/<a[^>]*href=["'](.*?)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```')
                // Clean up any remaining HTML tags
                .replace(/<[^>]*>/g, '')
                // Clean up excessive newlines
                .replace(/\n{3,}/g, '\n\n');

            // Fix common HTML entities
            markdown = markdown
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&ldquo;/g, '"')
                .replace(/&rdquo;/g, '"')
                .replace(/&lsquo;/g, "'")
                .replace(/&rsquo;/g, "'")
                .replace(/&mdash;/g, '—')
                .replace(/&ndash;/g, '–')
                .replace(/&hellip;/g, '…');

            return markdown.trim();
        } catch (error) {
            console.error("Error cleaning content for OpenAI:", error);
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
