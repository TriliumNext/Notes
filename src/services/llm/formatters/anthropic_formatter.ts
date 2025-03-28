import sanitizeHtml from 'sanitize-html';
import type { Message } from '../ai_interface.js';
import { BaseMessageFormatter } from './base_formatter.js';
import { PROVIDER_PROMPTS } from '../constants/llm_prompt_constants.js';
import { LLM_CONSTANTS } from '../constants/provider_constants.js';

/**
 * Anthropic-specific message formatter
 * Optimized for Claude's API and preferences
 */
export class AnthropicMessageFormatter extends BaseMessageFormatter {
    /**
     * Maximum recommended context length for Anthropic models
     * Claude has a very large context window
     */
    private static MAX_CONTEXT_LENGTH = LLM_CONSTANTS.CONTEXT_WINDOW.ANTHROPIC;

    /**
     * Format messages for the Anthropic API
     */
    formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[] {
        const formattedMessages: Message[] = [];

        // For Anthropic, system prompts work best as the first user message with <instructions> XML tags
        // First, collect all non-system messages
        const userAssistantMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');

        // For Anthropic, we need to handle context differently
        // 1. If explicit context is provided, we format it with XML tags
        if (context) {
            // Build the system message with context
            const formattedContext = PROVIDER_PROMPTS.ANTHROPIC.SYSTEM_WITH_CONTEXT(
                this.cleanContextContent(context)
            );

            // If there's at least one user message, add the context to the first one
            if (userAssistantMessages.length > 0 && userAssistantMessages[0].role === 'user') {
                // Add system as a new first message
                formattedMessages.push({
                    role: 'user',
                    content: formattedContext
                });

                // Add system response acknowledgment
                formattedMessages.push({
                    role: 'assistant',
                    content: PROVIDER_PROMPTS.ANTHROPIC.CONTEXT_ACKNOWLEDGMENT
                });

                // Add remaining messages
                for (const msg of userAssistantMessages) {
                    formattedMessages.push(msg);
                }
            }
            // If no user messages, create a placeholder
            else {
                formattedMessages.push({
                    role: 'user',
                    content: formattedContext
                });

                formattedMessages.push({
                    role: 'assistant',
                    content: PROVIDER_PROMPTS.ANTHROPIC.CONTEXT_QUERY_ACKNOWLEDGMENT
                });

                // Add any existing assistant messages if they exist
                const assistantMsgs = userAssistantMessages.filter(msg => msg.role === 'assistant');
                for (const msg of assistantMsgs) {
                    formattedMessages.push(msg);
                }
            }
        }
        // 2. If no explicit context but we have system messages, convert them to Claude format
        else if (messages.some(msg => msg.role === 'system')) {
            // Get system messages
            const systemMessages = messages.filter(msg => msg.role === 'system');

            // Build system content with XML tags
            const systemContent = PROVIDER_PROMPTS.ANTHROPIC.INSTRUCTIONS_WRAPPER(
                systemMessages.map(msg => this.cleanContextContent(msg.content)).join('\n\n')
            );

            // Add as first user message
            formattedMessages.push({
                role: 'user',
                content: systemContent
            });

            // Add assistant acknowledgment
            formattedMessages.push({
                role: 'assistant',
                content: PROVIDER_PROMPTS.ANTHROPIC.ACKNOWLEDGMENT
            });

            // Add remaining user/assistant messages
            for (const msg of userAssistantMessages) {
                formattedMessages.push(msg);
            }
        }
        // 3. Just a system prompt, no context
        else if (systemPrompt) {
            // Add as first user message with XML tags
            formattedMessages.push({
                role: 'user',
                content: PROVIDER_PROMPTS.ANTHROPIC.INSTRUCTIONS_WRAPPER(systemPrompt)
            });

            // Add assistant acknowledgment
            formattedMessages.push({
                role: 'assistant',
                content: PROVIDER_PROMPTS.ANTHROPIC.ACKNOWLEDGMENT
            });

            // Add all other messages
            for (const msg of userAssistantMessages) {
                formattedMessages.push(msg);
            }
        }
        // 4. No system prompt, use default from constants
        else if (userAssistantMessages.length > 0) {
            // Add default system prompt with XML tags
            formattedMessages.push({
                role: 'user',
                content: PROVIDER_PROMPTS.ANTHROPIC.INSTRUCTIONS_WRAPPER(this.getDefaultSystemPrompt())
            });

            // Add assistant acknowledgment
            formattedMessages.push({
                role: 'assistant',
                content: PROVIDER_PROMPTS.ANTHROPIC.ACKNOWLEDGMENT
            });

            // Add all user messages
            for (const msg of userAssistantMessages) {
                formattedMessages.push(msg);
            }
        }
        // 5. No special handling needed
        else {
            // Just add all messages as-is
            for (const msg of userAssistantMessages) {
                formattedMessages.push(msg);
            }
        }

        console.log(`Anthropic formatter: ${messages.length} messages → ${formattedMessages.length} messages`);
        return formattedMessages;
    }

    /**
     * Clean context content for Anthropic
     * Claude works well with XML-structured content
     */
    cleanContextContent(content: string): string {
        if (!content) return '';

        try {
            // Convert HTML to a Claude-friendly format
            const cleaned = sanitizeHtml(content, {
                allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'code', 'pre'],
                allowedAttributes: {
                    'a': ['href']
                }
            });

            // Convert to markdown but preserve some structure
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
                // Process lists
                .replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, content) => {
                    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
                })
                .replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, content) => {
                    let index = 1;
                    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, (m: string, item: string) => {
                        return `${index++}. ${item}\n`;
                    });
                })
                // Clean up any remaining HTML tags
                .replace(/<[^>]*>/g, '')
                // Clean up excessive newlines
                .replace(/\n{3,}/g, '\n\n')
                // Fix common HTML entities
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');

            return markdown.trim();
        } catch (error) {
            console.error("Error cleaning content for Anthropic:", error);
            return content; // Return original if cleaning fails
        }
    }

    /**
     * Get the maximum recommended context length for Anthropic
     */
    getMaxContextLength(): number {
        return AnthropicMessageFormatter.MAX_CONTEXT_LENGTH;
    }
}
