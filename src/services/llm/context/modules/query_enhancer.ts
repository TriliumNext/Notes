import log from '../../../log.js';
import cacheManager from './cache_manager.js';
import type { Message } from '../../ai_interface.js';
import { CONTEXT_PROMPTS } from '../../prompts/llm_prompt_constants.js';

/**
 * Provides utilities for enhancing queries and generating search queries
 */
export class QueryEnhancer {
    // Use the centralized query enhancer prompt
    private metaPrompt = CONTEXT_PROMPTS.QUERY_ENHANCER;

    /**
     * Generate search queries to find relevant information for the user question
     *
     * @param userQuestion - The user's question
     * @param llmService - The LLM service to use for generating queries
     * @returns Array of search queries
     */
    async generateSearchQueries(userQuestion: string, llmService: any): Promise<string[]> {
        try {
            // Check cache first
            const cached = cacheManager.getQueryResults(`searchQueries:${userQuestion}`);
            if (cached) {
                return cached;
            }

            const messages: Message[] = [
                { role: "system", content: this.metaPrompt },
                { role: "user", content: userQuestion }
            ];

            const options = {
                temperature: 0.3,
                maxTokens: 300
            };

            // Get the response from the LLM
            const response = await llmService.generateChatCompletion(messages, options);
            const responseText = response.text; // Extract the text from the response object

            try {
                // Remove code blocks, quotes, and clean up the response text
                let jsonStr = responseText
                    .replace(/```(?:json)?|```/g, '') // Remove code block markers
                    .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes with straight quotes
                    .trim();

                // Check if the text might contain a JSON array (has square brackets)
                if (jsonStr.includes('[') && jsonStr.includes(']')) {
                    // Extract just the array part if there's explanatory text
                    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
                    if (arrayMatch) {
                        jsonStr = arrayMatch[0];
                    }

                    // Try to parse the JSON
                    try {
                        const queries = JSON.parse(jsonStr);
                        if (Array.isArray(queries) && queries.length > 0) {
                            const result = queries.map(q => typeof q === 'string' ? q : String(q)).filter(Boolean);
                            cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, result);
                            return result;
                        }
                    } catch (innerError) {
                        // If parsing fails, log it and continue to the fallback
                        log.info(`JSON parse error: ${innerError}. Will use fallback parsing for: ${jsonStr}`);
                    }
                }

                // Fallback 1: Try to extract an array manually by splitting on commas between quotes
                if (jsonStr.includes('[') && jsonStr.includes(']')) {
                    const arrayContent = jsonStr.substring(
                        jsonStr.indexOf('[') + 1,
                        jsonStr.lastIndexOf(']')
                    );

                    // Use regex to match quoted strings, handling escaped quotes
                    const stringMatches = arrayContent.match(/"((?:\\.|[^"\\])*)"/g);
                    if (stringMatches && stringMatches.length > 0) {
                        const result = stringMatches
                            .map((m: string) => m.substring(1, m.length - 1)) // Remove surrounding quotes
                            .filter((s: string) => s.length > 0);
                        cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, result);
                        return result;
                    }
                }

                // Fallback 2: Extract queries line by line
                const lines = responseText.split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) =>
                        line.length > 0 &&
                        !line.startsWith('```') &&
                        !line.match(/^\d+\.?\s*$/) && // Skip numbered list markers alone
                        !line.match(/^\[|\]$/) // Skip lines that are just brackets
                    );

                if (lines.length > 0) {
                    // Remove numbering, quotes and other list markers from each line
                    const result = lines.map((line: string) => {
                        return line
                            .replace(/^\d+\.?\s*/, '') // Remove numbered list markers (1., 2., etc)
                            .replace(/^[-*•]\s*/, '')  // Remove bullet list markers
                            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                            .trim();
                    }).filter((s: string) => s.length > 0);

                    cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, result);
                    return result;
                }
            } catch (parseError) {
                log.error(`Error parsing search queries: ${parseError}`);
            }

            // If all else fails, just use the original question
            const fallback = [userQuestion];
            cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, fallback);
            return fallback;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log.error(`Error generating search queries: ${errorMessage}`);
            // Fallback to just using the original question
            return [userQuestion];
        }
    }

    /**
     * Estimate the complexity of a query
     * This is used to determine the appropriate amount of context to provide
     *
     * @param query - The query to analyze
     * @returns A complexity score from 0 (simple) to 1 (complex)
     */
    estimateQueryComplexity(query: string): number {
        // Simple complexity estimation based on various factors

        // Factor 1: Query length
        const lengthScore = Math.min(query.length / 100, 0.4);

        // Factor 2: Number of question words
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
        const questionWordsCount = questionWords.filter(word =>
            query.toLowerCase().includes(` ${word} `) ||
            query.toLowerCase().startsWith(`${word} `)
        ).length;
        const questionWordsScore = Math.min(questionWordsCount * 0.15, 0.3);

        // Factor 3: Contains comparison indicators
        const comparisonWords = ['compare', 'difference', 'versus', 'vs', 'similarities', 'differences'];
        const hasComparison = comparisonWords.some(word => query.toLowerCase().includes(word));
        const comparisonScore = hasComparison ? 0.2 : 0;

        // Factor 4: Request for detailed or in-depth information
        const depthWords = ['explain', 'detail', 'elaborate', 'analysis', 'in-depth'];
        const hasDepthRequest = depthWords.some(word => query.toLowerCase().includes(word));
        const depthScore = hasDepthRequest ? 0.2 : 0;

        // Combine scores with a maximum of 1.0
        return Math.min(lengthScore + questionWordsScore + comparisonScore + depthScore, 1.0);
    }
}

// Export singleton instance
export default new QueryEnhancer();
