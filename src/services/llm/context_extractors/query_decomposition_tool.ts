/**
 * Query Decomposition Tool - Compatibility Layer
 *
 * This file provides backward compatibility with the new consolidated
 * query_processor.js implementation.
 */

import log from '../../log.js';
import queryProcessor from '../context/services/query_processor.js';
import type { SubQuery, DecomposedQuery } from '../context/services/query_processor.js';

export type { SubQuery, DecomposedQuery };

export class QueryDecompositionTool {
  /**
   * Break down a complex query into smaller, more manageable sub-queries
   *
   * @param query The original user query
   * @param context Optional context about the current note being viewed
   * @returns A decomposed query object with sub-queries
   */
  decomposeQuery(query: string, context?: string): DecomposedQuery {
    log.info('Using compatibility layer for QueryDecompositionTool.decomposeQuery');
    return queryProcessor.decomposeQuery(query, context);
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
    log.info('Using compatibility layer for QueryDecompositionTool.updateSubQueryAnswer');
    return queryProcessor.updateSubQueryAnswer(decomposedQuery, subQueryId, answer);
  }

  /**
   * Synthesize all sub-query answers into a comprehensive response
   *
   * @param decomposedQuery The decomposed query with all sub-queries answered
   * @returns A synthesized answer to the original query
   */
  synthesizeAnswer(decomposedQuery: DecomposedQuery): string {
    log.info('Using compatibility layer for QueryDecompositionTool.synthesizeAnswer');
    return queryProcessor.synthesizeAnswer(decomposedQuery);
  }

  /**
   * Generate a status report on the progress of answering a complex query
   *
   * @param decomposedQuery The decomposed query
   * @returns A status report string
   */
  getQueryStatus(decomposedQuery: DecomposedQuery): string {
    log.info('Using compatibility layer for QueryDecompositionTool.getQueryStatus');
    // This method doesn't exist directly in the new implementation
    // We'll implement a simple fallback

    const answeredCount = decomposedQuery.subQueries.filter(sq => sq.isAnswered).length;
    const totalCount = decomposedQuery.subQueries.length;

    let status = `Progress: ${answeredCount}/${totalCount} sub-queries answered\n\n`;

    for (const sq of decomposedQuery.subQueries) {
      status += `${sq.isAnswered ? '✓' : '○'} ${sq.text}\n`;
      if (sq.isAnswered && sq.answer) {
        status += `Answer: ${sq.answer.substring(0, 100)}${sq.answer.length > 100 ? '...' : ''}\n`;
      }
      status += '\n';
    }

    return status;
  }

  /**
   * Assess the complexity of a query on a scale of 1-10
   *
   * @param query The query to assess
   * @returns A complexity score from 1-10
   */
  assessQueryComplexity(query: string): number {
    log.info('Using compatibility layer for QueryDecompositionTool.assessQueryComplexity');
    return queryProcessor.assessQueryComplexity(query);
  }
}

// Export default instance for compatibility
export default new QueryDecompositionTool();
