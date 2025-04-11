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
   * Generate enhanced search queries for better semantic matching
   *
   * @param userQuestion - The user's question
   * @param llmService - The LLM service to use for generating queries
   * @returns Array of search queries
   */
  async generateSearchQueries(
    userQuestion: string,
    llmService: LLMServiceInterface
  ): Promise<string[]> {
    if (!userQuestion || userQuestion.trim() === '') {
      return []; // Return empty array for empty input
    }

    try {
      // Check cache
      const cacheKey = `searchQueries:${userQuestion}`;
      const cached = cacheManager.getQueryResults<string[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        return cached;
      }

      // Prepare the prompt with JSON formatting instructions
      const enhancedPrompt = `${this.enhancerPrompt}
IMPORTANT: You must respond with valid JSON arrays. Always include commas between array elements.
Format your answer as a valid JSON array without markdown code blocks, like this: ["item1", "item2", "item3"]`;

      const messages = [
        { role: "system" as const, content: enhancedPrompt },
        { role: "user" as const, content: userQuestion }
      ];

      const options = {
        temperature: 0.3,
        maxTokens: 300,
        bypassFormatter: true,
        expectsJsonResponse: true,
        _bypassContextProcessing: true // Prevent recursive calls
      };

      // Get the response from the LLM
      const response = await llmService.generateChatCompletion(messages, options);
      const responseText = response.text;

      // Use the JsonExtractor to parse the response
      const queries = JsonExtractor.extract<string[]>(responseText, {
        extractArrays: true,
        minStringLength: 3,
        applyFixes: true,
        useFallbacks: true
      });

      if (queries && queries.length > 0) {
        log.info(`Extracted ${queries.length} queries using JsonExtractor`);
        cacheManager.storeQueryResults(cacheKey, queries);
        return queries;
      }

      // Fallback to original question
      const fallback = [userQuestion];
      log.info(`No queries extracted, using fallback: "${userQuestion}"`);
      cacheManager.storeQueryResults(cacheKey, fallback);
      return fallback;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Error generating search queries: ${errorMessage}`);
      return [userQuestion];
    }
  }

  /**
   * Break down a complex query into smaller, more manageable sub-queries
   *
   * @param query The original user query
   * @param context Optional context about the current note being viewed
   * @returns A decomposed query object with sub-queries
   */
  decomposeQuery(query: string, context?: string): DecomposedQuery {
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

      // Assess query complexity
      const complexity = this.assessQueryComplexity(query);
      log.info(`Query complexity assessment: ${complexity}/10`);

      // For simple queries, just return the original as a single sub-query
      if (complexity < 3) {
        log.info(`Simple query detected (complexity: ${complexity}), using direct approach`);

        const mainSubQuery = {
          id: this.generateSubQueryId(),
          text: query,
          reason: "Direct question that can be answered without decomposition",
          isAnswered: false
        };

        // Add a generic exploration query for context
        const genericQuery = {
          id: this.generateSubQueryId(),
          text: `What information is related to ${query}?`,
          reason: "General exploration to find related content",
          isAnswered: false
        };

        return {
          originalQuery: query,
          subQueries: [mainSubQuery, genericQuery],
          status: 'pending',
          complexity
        };
      }

      // For complex queries, break it down into sub-queries
      const subQueries = this.createSubQueries(query, context);
      log.info(`Decomposed query into ${subQueries.length} sub-queries`);

      return {
        originalQuery: query,
        subQueries,
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
   * Create sub-queries from a complex query
   *
   * @param query The original complex query
   * @param context Optional context to help with decomposition
   * @returns Array of sub-queries
   */
  private createSubQueries(query: string, context?: string): SubQuery[] {
    // Analyze the query to identify potential aspects to explore
    const questionParts = this.identifyQuestionParts(query);
    const subQueries: SubQuery[] = [];

    // Add the main query as the first sub-query
    subQueries.push({
      id: this.generateSubQueryId(),
      text: query,
      reason: "Main question (for direct matching)",
      isAnswered: false
    });

    // Add sub-queries for each identified question part
    for (const part of questionParts) {
      subQueries.push({
        id: this.generateSubQueryId(),
        text: part,
        reason: "Sub-aspect of the main question",
        isAnswered: false
      });
    }

    // Add a generic exploration query to find related information
    subQueries.push({
      id: this.generateSubQueryId(),
      text: `What information is related to ${query}?`,
      reason: "General exploration to find related content",
      isAnswered: false
    });

    // If we have context, add a specific query for that context
    if (context) {
      subQueries.push({
        id: this.generateSubQueryId(),
        text: `How does "${context}" relate to ${query}?`,
        reason: "Contextual relationship exploration",
        isAnswered: false
      });
    }

    return subQueries;
  }

  /**
   * Identify parts of a complex question that could be individual sub-questions
   *
   * @param query The complex query to analyze
   * @returns Array of potential sub-questions
   */
  private identifyQuestionParts(query: string): string[] {
    const parts: string[] = [];

    // Check for multiple question marks
    const questionSentences = query.split(/(?<=\?)/).filter(s => s.includes('?'));
    if (questionSentences.length > 1) {
      // Multiple explicit questions detected
      return questionSentences.map(s => s.trim());
    }

    // Check for conjunctions that might separate multiple questions
    const conjunctions = ['and', 'or', 'but', 'plus', 'also'];
    for (const conjunction of conjunctions) {
      const pattern = new RegExp(`\\b${conjunction}\\b`, 'i');
      if (pattern.test(query)) {
        // Split by conjunction and check if each part could be a question
        const splitParts = query.split(pattern);
        for (const part of splitParts) {
          const trimmed = part.trim();
          if (trimmed.length > 10) { // Avoid tiny fragments
            parts.push(trimmed);
          }
        }
        if (parts.length > 0) {
          return parts;
        }
      }
    }

    // Check for comparison indicators
    const comparisonTerms = ['compare', 'difference', 'differences', 'versus', 'vs'];
    for (const term of comparisonTerms) {
      if (query.toLowerCase().includes(term)) {
        // This is likely a comparison question, extract the items being compared
        const beforeAfter = query.split(new RegExp(`\\b${term}\\b`, 'i'));
        if (beforeAfter.length === 2) {
          // Try to extract compared items
          const aspects = this.extractComparisonAspects(beforeAfter[0], beforeAfter[1]);
          if (aspects.length > 0) {
            for (const aspect of aspects) {
              parts.push(`What are the key points about ${aspect}?`);
            }
            parts.push(`What are the differences between ${aspects.join(' and ')}?`);
            return parts;
          }
        }
      }
    }

    // Check for "multiple aspects" questions
    const aspectPatterns = [
      /what (?:are|is) the (\w+) (?:of|about|for|in) /i,
      /how (?:to|do|does|can) .+ (\w+)/i
    ];

    for (const pattern of aspectPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const aspect = match[1];
        parts.push(`What is the ${aspect}?`);
        parts.push(`How does ${aspect} relate to the main topic?`);
      }
    }

    return parts;
  }

  /**
   * Extract items being compared from a comparison question
   *
   * @param before Text before the comparison term
   * @param after Text after the comparison term
   * @returns Array of items being compared
   */
  private extractComparisonAspects(before: string, after: string): string[] {
    const aspects: string[] = [];

    // Look for "between A and B" pattern
    const betweenMatch = after.match(/between (.+?) and (.+?)(?:\?|$)/i);
    if (betweenMatch) {
      aspects.push(betweenMatch[1].trim());
      aspects.push(betweenMatch[2].trim());
      return aspects;
    }

    // Look for A vs B pattern
    const directComparison = after.match(/(.+?) (?:and|vs|versus) (.+?)(?:\?|$)/i);
    if (directComparison) {
      aspects.push(directComparison[1].trim());
      aspects.push(directComparison[2].trim());
      return aspects;
    }

    // Fall back to looking for named entities or key terms in both parts
    const beforeTerms = before.match(/(\w+(?:\s+\w+){0,2})/g) || [];
    const afterTerms = after.match(/(\w+(?:\s+\w+){0,2})/g) || [];

    // Look for substantial terms (longer than 3 chars)
    const candidateTerms = [...beforeTerms, ...afterTerms]
      .filter(term => term.length > 3)
      .map(term => term.trim());

    // Take up to 2 distinct terms
    return [...new Set(candidateTerms)].slice(0, 2);
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
