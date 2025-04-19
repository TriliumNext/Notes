/**
 * Contains functions for generating summaries of note content
 * Used to provide concise context for LLM processing
 */

import { sanitizeHtmlContent } from './note_content.js';

/**
 * Options for summarization
 */
export interface SummarizationOptions {
    /**
     * Maximum length of the summary in characters
     */
    maxLength?: number;

    /**
     * Whether to include title in the summary
     */
    includeTitle?: boolean;

    /**
     * Minimum content length to trigger summarization
     */
    minContentLengthForSummarization?: number;
}

/**
 * Default summarization options
 */
const DEFAULT_SUMMARIZATION_OPTIONS: Required<SummarizationOptions> = {
    maxLength: 500,
    includeTitle: true,
    minContentLengthForSummarization: 1000
};

/**
 * Summarize note content
 * If the content is smaller than minContentLengthForSummarization, returns trimmed content
 * This is a local implementation that doesn't require API calls
 */
export function summarizeContent(
    content: string,
    title: string = '',
    options: SummarizationOptions = {}
): string {
    // Merge provided options with defaults
    const config: Required<SummarizationOptions> = {
        ...DEFAULT_SUMMARIZATION_OPTIONS,
        ...options
    };

    // Clean up the content
    const cleanedContent = sanitizeHtmlContent(content);

    // If content is small enough, no need to summarize
    if (cleanedContent.length < config.minContentLengthForSummarization) {
        // Just truncate if needed
        if (cleanedContent.length > config.maxLength) {
            return cleanedContent.substring(0, config.maxLength) + '...';
        }
        return cleanedContent;
    }

    // Use local summarization
    return generateLocalSummary(cleanedContent, config);
}

/**
 * Generate a simple summary locally without using LLM API
 */
function generateLocalSummary(content: string, options: Required<SummarizationOptions>): string {
    // Simple heuristic approach - extract first paragraph and some key sentences

    // First, try to get the first paragraph that has reasonable length
    const paragraphs = content.split(/\n\s*\n/);
    let summary = '';

    for (const paragraph of paragraphs) {
        if (paragraph.length > 30 && !paragraph.startsWith('#') && !paragraph.startsWith('!')) {
            summary = paragraph;
            break;
        }
    }

    // If no good paragraph found, use the first X characters
    if (!summary) {
        summary = content.substring(0, options.maxLength * 0.8);
    }

    // Truncate if too long
    if (summary.length > options.maxLength) {
        summary = summary.substring(0, options.maxLength) + '...';
    }

    return summary;
}

/**
 * Extract key points from content
 * Returns a bulleted list of key points
 * This is a local implementation that doesn't require API calls
 */
export function extractKeyPoints(
    content: string,
    maxPoints: number = 5
): string[] {
    // Clean up the content
    const cleanedContent = sanitizeHtmlContent(content);

    // Use local extraction
    return generateLocalKeyPoints(cleanedContent, maxPoints);
}

/**
 * Generate key points locally without using LLM API
 */
function generateLocalKeyPoints(content: string, maxPoints: number): string[] {
    // Simple approach - look for sentences that might contain key information
    const sentences = content
        .replace(/\n+/g, ' ')
        .split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    // Heuristics for important sentences - look for indicator phrases
    const importanceMarkers = [
        'important', 'key', 'significant', 'essential', 'critical',
        'main', 'primary', 'crucial', 'vital', 'fundamental',
        'in summary', 'to summarize', 'in conclusion', 'conclude',
        'therefore', 'thus', 'consequently', 'as a result'
    ];

    // Score sentences based on potential importance
    const scoredSentences = sentences.map(sentence => {
        let score = 0;

        // Sentences at the beginning or end are often important
        if (sentences.indexOf(sentence) < sentences.length * 0.1) score += 3;
        if (sentences.indexOf(sentence) > sentences.length * 0.9) score += 4;

        // Check for importance markers
        for (const marker of importanceMarkers) {
            if (sentence.toLowerCase().includes(marker)) {
                score += 2;
            }
        }

        // Prefer medium-length sentences
        if (sentence.length > 40 && sentence.length < 150) score += 2;

        return { sentence, score };
    });

    // Sort by score and take top N
    const topSentences = scoredSentences
        .sort((a, b) => b.score - a.score)
        .slice(0, maxPoints)
        .map(item => item.sentence + '.');

    return topSentences;
}
