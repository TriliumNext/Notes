/**
 * Unified Query Processor Service
 *
 * Consolidates functionality from:
 * - query_enhancer.ts
 * - query_decomposition_tool.ts
 *
 * This service provides a central interface for all query processing operations,
 * including enhancement, decomposition, and complexity analysis.
 */

import log from '../../../log.js';
import cacheManager from '../modules/cache_manager.js';
import { CONTEXT_PROMPTS } from '../../constants/llm_prompt_constants.js';
import { QUERY_DECOMPOSITION_STRINGS } from '../../constants/query_decomposition_constants.js';
import JsonExtractor from '../../utils/json_extractor.js';
import type { LLMServiceInterface } from '../../interfaces/agent_tool_interfaces.js';
import { SEARCH_CONSTANTS } from '../../constants/search_constants.js';
import aiServiceManager from '../../ai_service_manager.js';

// Interfaces
export interface SubQuery {
    id: string;
    text: string;
    reason: string;
    isAnswered: boolean;
    answer?: string;
}

export interface DecomposedQuery {
    originalQuery: string;
    subQueries: SubQuery[];
    status: 'pending' | 'in_progress' | 'completed';
    complexity: number;
}

export class QueryProcessor {
    private static queryCounter: number = 0;

    // Prompt templates
    private enhancerPrompt = CONTEXT_PROMPTS.QUERY_ENHANCER;

    /**
     * Get a valid LLM service or null if none available
     *
     * @returns Available LLM service or null
     */
    private async getLLMService(): Promise<LLMServiceInterface | null> {
        try {
            // Get the service from the AI service manager
            return aiServiceManager.getService();
        } catch (error: any) {
            log.error(`Error getting LLM service: ${error.message || String(error)}`);
            return null;
        }
    }
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

            const PROMPT = `You are an AI assistant that decides what information needs to be retrieved from a user's knowledge base called TriliumNext Notes to answer the user's question.
Given the user's question, generate 3-5 specific search queries that would help find relevant information.
Each query should be focused on a different aspect of the question.
Avoid generating queries that are too broad, vague, or about a user's entire Note database, and make sure they are relevant to the user's question.
Format your answer as a JSON array of strings, with each string being a search query.
Example: ["exact topic mentioned", "related concept 1", "related concept 2"]`

            interface Message {
                role: 'user' | 'assistant' | 'system';
                content: string;
            }

            const messages: Message[] = [
                { role: "system", content: PROMPT },
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

                log.info(`Cleaned JSON string: ${jsonStr}`);

                // Check if the text might contain a JSON structure (has curly braces or square brackets)
                if ((jsonStr.includes('{') && jsonStr.includes('}')) || (jsonStr.includes('[') && jsonStr.includes(']'))) {
                    // Try to extract the JSON structure
                    let jsonMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[0];
                        log.info(`Extracted JSON structure: ${jsonStr}`);
                    }

                    // Try to parse the JSON
                    try {
                        const parsed = JSON.parse(jsonStr);

                        // Handle array format: ["query1", "query2"]
                        if (Array.isArray(parsed)) {
                            const result = parsed
                                .map(q => typeof q === 'string' ? q.trim() : String(q).trim())
                                .filter(Boolean);
                            cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, result);
                            return result;
                        }
                        // Handle object format: {"query1": "reason1", "query2": "reason2"} or {"query1" : "query2"}
                        else if (typeof parsed === 'object' && parsed !== null) {
                            // Extract both keys and values as potential queries
                            const keys = Object.keys(parsed);
                            const values = Object.values(parsed);

                            // Add keys as queries
                            const keysResult = keys
                                .filter(key => key && key.length > 3)
                                .map(key => key.trim());

                            // Add values as queries if they're strings and not already included
                            const valuesResult = values
                                .filter((val): val is string => typeof val === 'string' && val.length > 3)
                                .map(val => val.trim())
                                .filter(val => !keysResult.includes(val));

                            const result = [...keysResult, ...valuesResult];
                            cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, result);
                            return result;
                        }
                    } catch (parseError) {
                        log.info(`JSON parse error: ${parseError}. Will use fallback parsing.`);
                    }
                }

                // Fallback: Try to extract an array manually by splitting on commas between quotes
                if (jsonStr.includes('[') && jsonStr.includes(']')) {
                    const arrayContent = jsonStr.substring(
                        jsonStr.indexOf('[') + 1,
                        jsonStr.lastIndexOf(']')
                    );

                    // Use regex to match quoted strings, handling escaped quotes
                    const stringMatches = arrayContent.match(/"((?:\\.|[^"\\])*)"/g);
                    if (stringMatches && stringMatches.length > 0) {
                        const result = stringMatches
                            .map((m: string) => m.substring(1, m.length - 1).trim()) // Remove surrounding quotes
                            .filter((s: string) => s.length > 0);
                        cacheManager.storeQueryResults(`searchQueries:${userQuestion}`, result);
                        return result;
                    }
                }

                // Fallback: Try to extract key-value pairs from object notation manually
                if (jsonStr.includes('{') && jsonStr.includes('}')) {
                    // Extract content between curly braces
                    const objectContent = jsonStr.substring(
                        jsonStr.indexOf('{') + 1,
                        jsonStr.lastIndexOf('}')
                    );

                    // Split by commas that aren't inside quotes
                    const pairs: string[] = objectContent.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

                    const result = pairs
                        .map(pair => {
                            // Split by colon that isn't inside quotes
                            const keyValue = pair.split(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
                            if (keyValue.length === 2) {
                                const key = keyValue[0].replace(/"/g, '').trim();
                                const value = keyValue[1].replace(/"/g, '').trim();

                                if (key && key.length > 3) {
                                    return key;
                                }

                                if (value && value.length > 3) {
                                    return value;
                                }
                            }
                            return null;
                        })
                        .filter((s: string | null) => s !== null);

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
     * Break down a complex query into smaller, more manageable sub-queries
     *
     * @param query The original user query
     * @param context Optional context about the current note being viewed
     * @param llmService Optional LLM service to use for advanced decomposition
     * @returns A decomposed query object with sub-queries
     */
    async decomposeQuery(
        query: string,
        context?: string,
        llmService?: LLMServiceInterface
    ): Promise<DecomposedQuery> {
        try {
            // Log the decomposition attempt
            log.info(`Decomposing query: "${query}"`);

            if (!query || query.trim().length === 0) {
                log.info(`Query is empty, skipping decomposition`);
                return {
                    originalQuery: query,
                    subQueries: [],
                    status: 'pending',
                    complexity: 0
                };
            }

            // Simple assessment of query complexity
            const complexity = query.length > 100 ? 5 : 3;

            // Get LLM service if not provided
            const service = llmService || await this.getLLMService();

            // If no LLM service is available, use original query
            if (!service) {
                log.info(`No LLM service available for query decomposition, using original query`);
                return {
                    originalQuery: query,
                    subQueries: [{
                        id: this.generateSubQueryId(),
                        text: query,
                        reason: "Original query",
                        isAnswered: false
                    }],
                    status: 'pending',
                    complexity
                };
            }

            // Make a simple request to decompose the query
            const result = await this.simpleQueryDecomposition(query, service, context);

            // Return the result
            return {
                originalQuery: query,
                subQueries: result,
                status: 'pending',
                complexity
            };
        } catch (error: any) {
            log.error(`Error decomposing query: ${error.message}`);

            // Fallback to treating it as a simple query
            return {
                originalQuery: query,
                subQueries: [{
                    id: this.generateSubQueryId(),
                    text: query,
                    reason: "Error occurred during decomposition, using original query",
                    isAnswered: false
                }],
                status: 'pending',
                complexity: 1
            };
        }
    }

    /**
     * Simple LLM-based query decomposition
     *
     * @param query The original query to decompose
     * @param llmService LLM service to use
     * @param context Optional context to help with decomposition
     * @returns Array of sub-queries
     */
    private async simpleQueryDecomposition(
        query: string,
        llmService: LLMServiceInterface,
        context?: string
    ): Promise<SubQuery[]> {
        try {
            // Use the proven prompt format that was working before
            const prompt = `You are an AI assistant that decides what information needs to be retrieved from a user's knowledge base called TriliumNext Notes to answer the user's question.
Given the user's question, generate 3-5 specific search queries that would help find relevant information.
Each query should be focused on a different aspect of the question.
Avoid generating queries that are too broad, vague, or about a user's entire Note database, and make sure they are relevant to the user's question.
Format your answer as a JSON array of strings, with each string being a search query.
Example: ["exact topic mentioned", "related concept 1", "related concept 2"]`;

            log.info(`Sending decomposition prompt to LLM for query: "${query}"`);

            const messages = [
                { role: "system" as const, content: prompt },
                { role: "user" as const, content: query }
            ];

            const options = {
                temperature: 0.3,
                maxTokens: 300,
                bypassFormatter: true,
                expectsJsonResponse: true,
                _bypassContextProcessing: true,
                enableTools: false
            };

            // Get the response from the LLM
            const response = await llmService.generateChatCompletion(messages, options);
            const responseText = response.text;

            log.info(`Received LLM response for decomposition: ${responseText.substring(0, 200)}...`);

            // Parse the response to extract the queries
            let searchQueries: string[] = [];
            try {
                // Remove code blocks, quotes, and clean up the response text
                let jsonStr = responseText
                    .replace(/```(?:json)?|```/g, '') // Remove code block markers
                    .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes with straight quotes
                    .trim();

                log.info(`Cleaned JSON string: ${jsonStr}`);

                // Check if the text might contain a JSON structure (has curly braces or square brackets)
                if ((jsonStr.includes('{') && jsonStr.includes('}')) || (jsonStr.includes('[') && jsonStr.includes(']'))) {
                    // Try to extract the JSON structure
                    let jsonMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[0];
                        log.info(`Extracted JSON structure: ${jsonStr}`);
                    }

                    // Try to parse the JSON
                    try {
                        const parsed = JSON.parse(jsonStr);

                        // Handle array format: ["query1", "query2"]
                        if (Array.isArray(parsed)) {
                            searchQueries = parsed
                                .map(q => typeof q === 'string' ? q.trim() : String(q).trim())
                                .filter(Boolean);
                            log.info(`Extracted ${searchQueries.length} queries from JSON array`);
                        }
                        // Handle object format: {"query1": "reason1", "query2": "reason2"} or {"query1" : "query2"}
                        else if (typeof parsed === 'object' && parsed !== null) {
                            // Extract both keys and values as potential queries
                            const keys = Object.keys(parsed);
                            const values = Object.values(parsed);

                            // Add keys as queries
                            searchQueries = keys
                                .filter(key => key && key.length > 3)
                                .map(key => key.trim());

                            // Add values as queries if they're strings and not already included
                            values
                                .filter((val): val is string => typeof val === 'string' && val.length > 3)
                                .map(val => val.trim())
                                .forEach((val: string) => {
                                    if (!searchQueries.includes(val)) {
                                        searchQueries.push(val);
                                    }
                                });

                            log.info(`Extracted ${searchQueries.length} queries from JSON object`);
                        }
                    } catch (parseError) {
                        log.info(`JSON parse error: ${parseError}. Will use fallback parsing.`);
                    }
                }

                // Fallback: Try to extract an array manually by splitting on commas between quotes
                if (searchQueries.length === 0 && jsonStr.includes('[') && jsonStr.includes(']')) {
                    const arrayContent = jsonStr.substring(
                        jsonStr.indexOf('[') + 1,
                        jsonStr.lastIndexOf(']')
                    );

                    // Use regex to match quoted strings, handling escaped quotes
                    const stringMatches = arrayContent.match(/"((?:\\.|[^"\\])*)"/g);
                    if (stringMatches && stringMatches.length > 0) {
                        searchQueries = stringMatches
                            .map((m: string) => m.substring(1, m.length - 1).trim()) // Remove surrounding quotes
                            .filter((s: string) => s.length > 0);
                        log.info(`Extracted ${searchQueries.length} queries using regex`);
                    }
                }

                // Fallback: Try to extract key-value pairs from object notation manually
                if (searchQueries.length === 0 && jsonStr.includes('{') && jsonStr.includes('}')) {
                    // Extract content between curly braces
                    const objectContent = jsonStr.substring(
                        jsonStr.indexOf('{') + 1,
                        jsonStr.lastIndexOf('}')
                    );

                    // Split by commas that aren't inside quotes
                    const pairs: string[] = objectContent.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

                    for (const pair of pairs) {
                        // Split by colon that isn't inside quotes
                        const keyValue = pair.split(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
                        if (keyValue.length === 2) {
                            const key = keyValue[0].replace(/"/g, '').trim();
                            const value = keyValue[1].replace(/"/g, '').trim();

                            if (key && key.length > 3 && !searchQueries.includes(key)) {
                                searchQueries.push(key);
                            }

                            if (value && value.length > 3 && !searchQueries.includes(value)) {
                                searchQueries.push(value);
                            }
                        }
                    }

                    log.info(`Extracted ${searchQueries.length} queries from manual object parsing`);
                }

                // Convert search queries to SubQuery objects
                if (searchQueries.length > 0) {
                    const subQueries = searchQueries.map((text, index) => ({
                        id: this.generateSubQueryId(),
                        text,
                        reason: `Search query ${index + 1}`,
                        isAnswered: false
                    }));

                    // Always include the original query if not already included
                    const hasOriginal = subQueries.some(sq => sq.text.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(sq.text.toLowerCase()));
                    if (!hasOriginal) {
                        subQueries.unshift({
                            id: this.generateSubQueryId(),
                            text: query.trim(),
                            reason: "Original query",
                            isAnswered: false
                        });
                        log.info(`Added original query to sub-queries list`);
                    }

                    log.info(`Final sub-queries for vector search: ${subQueries.map(sq => `"${sq.text}"`).join(', ')}`);
                    return subQueries;
                }
            } catch (parseError) {
                log.error(`Error parsing search queries: ${parseError}`);
            }

            // Fallback if all extraction methods fail
            log.info(`Using fallback queries`);
            return [
                {
                    id: this.generateSubQueryId(),
                    text: query,
                    reason: "Original query",
                    isAnswered: false
                },
                {
                    id: this.generateSubQueryId(),
                    text: `${query.trim()} overview`,
                    reason: "General information",
                    isAnswered: false
                },
                {
                    id: this.generateSubQueryId(),
                    text: `${query.trim()} examples`,
                    reason: "Practical examples",
                    isAnswered: false
                }
            ];
        } catch (error) {
            log.error(`Error in simpleQueryDecomposition: ${error}`);

            // Return the original query as fallback
            return [{
                id: this.generateSubQueryId(),
                text: query,
                reason: "Error occurred, using original query",
                isAnswered: false
            }];
        }
    }

    /**
     * Generate a unique ID for a sub-query
     *
     * @returns A unique sub-query ID
     */
    private generateSubQueryId(): string {
        QueryProcessor.queryCounter++;
        return `sq_${Date.now()}_${QueryProcessor.queryCounter}`;
    }

    /**
     * Assess the complexity of a query on a scale of 1-10
     * This helps determine if decomposition is needed
     *
     * @param query The query to assess
     * @returns A complexity score from 1-10
     */
    assessQueryComplexity(query: string): number {
        let score = 0;

        // Factor 1: Length - longer queries tend to be more complex
        // 0-1.5 points for length
        const lengthScore = Math.min(query.length / 100, 1.5);
        score += lengthScore;

        // Factor 2: Question marks - multiple questions are more complex
        // 0-2 points for question marks
        const questionMarkCount = (query.match(/\?/g) || []).length;
        score += Math.min(questionMarkCount * 0.8, 2);

        // Factor 3: Question words - multiple "wh" questions indicate complexity
        // 0-2 points for question words
        const questionWords = ['what', 'why', 'how', 'when', 'where', 'who', 'which'];
        let questionWordCount = 0;

        for (const word of questionWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            questionWordCount += (query.match(regex) || []).length;
        }

        score += Math.min(questionWordCount * 0.5, 2);

        // Factor 4: Conjunctions - linking multiple concepts increases complexity
        // 0-1.5 points for conjunctions
        const conjunctions = ['and', 'or', 'but', 'however', 'although', 'nevertheless', 'despite', 'whereas'];
        let conjunctionCount = 0;

        for (const conj of conjunctions) {
            const regex = new RegExp(`\\b${conj}\\b`, 'gi');
            conjunctionCount += (query.match(regex) || []).length;
        }

        score += Math.min(conjunctionCount * 0.3, 1.5);

        // Factor 5: Comparison terms - comparisons are complex
        // 0-1.5 points for comparison terms
        const comparisonTerms = ['compare', 'difference', 'differences', 'versus', 'vs', 'similarities', 'better', 'worse'];
        let comparisonCount = 0;

        for (const term of comparisonTerms) {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            comparisonCount += (query.match(regex) || []).length;
        }

        score += Math.min(comparisonCount * 0.7, 1.5);

        // Factor 6: Technical terms and depth indicators
        // 0-1.5 points for depth indicators
        const depthTerms = ['explain', 'detail', 'elaborate', 'in-depth', 'comprehensive', 'thoroughly', 'analysis'];
        let depthCount = 0;

        for (const term of depthTerms) {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            depthCount += (query.match(regex) || []).length;
        }

        score += Math.min(depthCount * 0.5, 1.5);

        // Return final score, capped at 10
        return Math.min(Math.round(score), 10);
    }

    /**
     * Update a sub-query with its answer
     *
     * @param decomposedQuery The decomposed query object
     * @param subQueryId The ID of the sub-query to update
     * @param answer The answer to the sub-query
     * @returns The updated decomposed query
     */
    updateSubQueryAnswer(
        decomposedQuery: DecomposedQuery,
        subQueryId: string,
        answer: string
    ): DecomposedQuery {
        const updatedSubQueries = decomposedQuery.subQueries.map(sq => {
            if (sq.id === subQueryId) {
                return {
                    ...sq,
                    answer,
                    isAnswered: true
                };
            }
            return sq;
        });

        // Check if all sub-queries are answered
        const allAnswered = updatedSubQueries.every(sq => sq.isAnswered);

        return {
            ...decomposedQuery,
            subQueries: updatedSubQueries,
            status: allAnswered ? 'completed' : 'in_progress'
        };
    }

    /**
     * Synthesize all sub-query answers into a comprehensive response
     *
     * @param decomposedQuery The decomposed query with all sub-queries answered
     * @returns A synthesized answer to the original query
     */
    synthesizeAnswer(decomposedQuery: DecomposedQuery): string {
        try {
            // Ensure all sub-queries are answered
            if (!decomposedQuery.subQueries.every(sq => sq.isAnswered)) {
                return "Cannot synthesize answer until all sub-queries are answered.";
            }

            // For simple queries with just one sub-query, return the answer directly
            if (decomposedQuery.subQueries.length === 1) {
                return decomposedQuery.subQueries[0].answer || "";
            }

            // For complex queries, build a structured response
            let synthesized = `Answer to: ${decomposedQuery.originalQuery}\n\n`;

            // Group by themes if there are many sub-queries
            if (decomposedQuery.subQueries.length > 3) {
                synthesized += "Based on the information gathered:\n\n";

                for (const sq of decomposedQuery.subQueries) {
                    synthesized += `${sq.answer}\n\n`;
                }
            } else {
                // For fewer sub-queries, present each one with its question
                for (const sq of decomposedQuery.subQueries) {
                    synthesized += `${sq.answer}\n\n`;
                }
            }

            return synthesized.trim();
        } catch (error: any) {
            log.error(`Error synthesizing answer: ${error.message}`);
            return "An error occurred while synthesizing the answer.";
        }
    }
}

// Export a singleton instance
export default new QueryProcessor();
