import sanitizeHtml from 'sanitize-html';
import type { Message } from '../ai_interface.js';
import type { MessageFormatter } from '../interfaces/message_formatter.js';
import { DEFAULT_SYSTEM_PROMPT, PROVIDER_PROMPTS } from '../constants/llm_prompt_constants.js';

/**
 * Base formatter with common functionality for all providers
 * Provider-specific formatters should extend this class
 */
export abstract class BaseMessageFormatter implements MessageFormatter {
    /**
     * Format messages for the LLM API
     * Each provider should override this method with its specific formatting logic
     */
    abstract formatMessages(messages: Message[], systemPrompt?: string, context?: string): Message[];

    /**
     * Get the maximum recommended context length for this provider
     * Each provider should override this with appropriate value
     */
    abstract getMaxContextLength(): number;

    /**
     * Get the default system prompt
     * Uses the default prompt from constants
     */
    protected getDefaultSystemPrompt(systemPrompt?: string): string {
        return systemPrompt || DEFAULT_SYSTEM_PROMPT || PROVIDER_PROMPTS.COMMON.DEFAULT_ASSISTANT_INTRO;
    }

    /**
     * Clean context content - common method with standard HTML cleaning
     * Provider-specific formatters can override for custom behavior
     */
    cleanContextContent(content: string): string {
        if (!content) return '';

        try {
            // First fix any encoding issues
            const fixedContent = this.fixEncodingIssues(content);

            // Convert HTML to markdown for better readability
            const cleaned = sanitizeHtml(fixedContent, {
                allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'code', 'pre'],
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

            // Process inline elements to markdown
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

            // Process list items
            markdown = this.processListItems(markdown);

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
            console.error("Error cleaning context content:", error);
            return content; // Return original if cleaning fails
        }
    }

    /**
     * Process HTML list items in markdown conversion
     * This is a helper method that safely processes HTML list items
     */
    protected processListItems(content: string): string {
        // Process unordered lists
        let result = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match: string, listContent: string) => {
            return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
        });

        // Process ordered lists
        result = result.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match: string, listContent: string) => {
            let index = 1;
            return listContent.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (itemMatch: string, item: string) => {
                return `${index++}. ${item}\n`;
            });
        });

        return result;
    }

    /**
     * Fix common encoding issues in content
     * This fixes issues like broken quote characters and other encoding problems
     *
     * @param content The content to fix encoding issues in
     * @returns Content with encoding issues fixed
     */
    protected fixEncodingIssues(content: string): string {
        if (!content) return '';

        try {
            // Fix common encoding issues
            return content
                // Fix broken quote characters
                .replace(/Γ\u00c2[\u00a3\u00a5]/g, '"')
                // Fix other common broken unicode
                .replace(/[\u{0080}-\u{FFFF}]/gu, (match) => {
                    // Some common replacements
                    const replacements: Record<string, string> = {
                        '\u00A0': ' ',  // Non-breaking space
                        '\u2018': "'",  // Left single quote
                        '\u2019': "'",  // Right single quote
                        '\u201C': '"',  // Left double quote
                        '\u201D': '"',  // Right double quote
                        '\u2013': '-',  // En dash
                        '\u2014': '--', // Em dash
                        '\u2022': '*',  // Bullet
                        '\u2026': '...' // Ellipsis
                    };

                    return replacements[match] || match;
                });
        } catch (error) {
            console.error('Error fixing encoding issues:', error);
            return content; // Return original if fixing fails
        }
    }
}
