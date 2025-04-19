/**
 * Query Decomposition Constants
 *
 * This file centralizes all string constants used in the query decomposition tool.
 * These constants can be translated for internationalization support.
 */

export const QUERY_DECOMPOSITION_STRINGS = {
    // Log messages
    LOG_MESSAGES: {
        DECOMPOSING_QUERY: (query: string) => `Decomposing query: "${query.substring(0, 100)}..."`,
        EMPTY_QUERY: "Query decomposition called with empty query",
        COMPLEXITY_ASSESSMENT: (complexity: number) => `Query complexity assessment: ${complexity}/10`,
        SIMPLE_QUERY: (complexity: number) => `Query is simple (complexity ${complexity}), returning as single sub-query`,
        DECOMPOSED_INTO: (count: number) => `Decomposed query into ${count} sub-queries`,
        SUB_QUERY_LOG: (index: number, text: string, reason: string) => `Sub-query ${index + 1}: "${text}" - Reason: ${reason}`,
        ERROR_DECOMPOSING: (error: string) => `Error decomposing query: ${error}`,
        AVOIDING_RECURSIVE: (query: string) => `Avoiding recursive subqueries for query "${query.substring(0, 50)}..."`,
        ERROR_SYNTHESIZING: (error: string) => `Error synthesizing answer: ${error}`
    },

    // Query identification patterns
    QUERY_PATTERNS: {
        PROVIDE_DETAILS_ABOUT: "provide details about",
        INFORMATION_RELATED_TO: "information related to",
        COMPARE: "compare",
        DIFFERENCE_BETWEEN: "difference between",
        VS: " vs ",
        VERSUS: "versus",
        HOW_TO: "how to ",
        WHY: "why ",
        WHAT_IS: "what is ",
        WHAT_ARE: "what are "
    },

    // Question words used for complexity assessment
    QUESTION_WORDS: ['what', 'how', 'why', 'where', 'when', 'who', 'which'],

    // Conjunctions used for complexity assessment
    CONJUNCTIONS: ['and', 'or', 'but', 'as well as'],

    // Comparison terms used for complexity assessment
    COMPARISON_TERMS: ['compare', 'versus', 'vs', 'difference', 'similarities'],

    // Analysis terms used for complexity assessment
    ANALYSIS_TERMS: ['analyze', 'examine', 'investigate', 'explore', 'explain', 'discuss'],

    // Common stop words for parsing
    STOP_WORDS: ['the', 'of', 'and', 'or', 'vs', 'versus', 'between', 'comparison', 'compared', 'to', 'with', 'what', 'is', 'are', 'how', 'why', 'when', 'which'],

    // Sub-query templates
    SUB_QUERY_TEMPLATES: {
        INFORMATION_RELATED: (query: string) => `Information related to ${query}`,
        KEY_CHARACTERISTICS: (entity: string) => `What are the key characteristics of ${entity}?`,
        COMPARISON_FEATURES: (entities: string[]) => `How do ${entities.join(' and ')} compare in terms of their primary features?`,
        STEPS_TO: (topic: string) => `What are the steps to ${topic}?`,
        CHALLENGES: (topic: string) => `What are common challenges or pitfalls when trying to ${topic}?`,
        CAUSES: (topic: string) => `What are the causes of ${topic}?`,
        EVIDENCE: (topic: string) => `What evidence supports explanations for ${topic}?`,
        DEFINITION: (topic: string) => `Definition of ${topic}`,
        EXAMPLES: (topic: string) => `Examples of ${topic}`,
        KEY_INFORMATION: (concept: string) => `Key information about ${concept}`
    },

    // Sub-query reasons
    SUB_QUERY_REASONS: {
        GETTING_DETAILS: (entity: string) => `Getting details about "${entity}" for comparison`,
        DIRECT_COMPARISON: 'Direct comparison of the entities',
        FINDING_PROCEDURAL: 'Finding procedural information',
        IDENTIFYING_DIFFICULTIES: 'Identifying potential difficulties',
        IDENTIFYING_CAUSES: 'Identifying causes',
        FINDING_EVIDENCE: 'Finding supporting evidence',
        GETTING_DEFINITION: 'Getting basic definition',
        FINDING_EXAMPLES: 'Finding examples',
        FINDING_INFORMATION: (concept: string) => `Finding information about "${concept}"`
    },

    // Synthesis answer templates
    SYNTHESIS_TEMPLATES: {
        CANNOT_SYNTHESIZE: "Cannot synthesize answer - not all sub-queries have been answered.",
        ANSWER_TO: (query: string) => `Answer to: "${query}"\n\n`,
        BASED_ON_INFORMATION: "Based on the information gathered:\n\n",
        ERROR_SYNTHESIZING: "Error synthesizing the final answer."
    },

    // Query status templates
    STATUS_TEMPLATES: {
        PROGRESS: (answered: number, total: number) => `Progress: ${answered}/${total} sub-queries answered\n\n`,
        ANSWERED_MARKER: "✓",
        UNANSWERED_MARKER: "○",
        ANSWER_PREFIX: "   Answer: "
    }
};

export default QUERY_DECOMPOSITION_STRINGS;
