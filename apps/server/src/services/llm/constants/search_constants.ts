export const SEARCH_CONSTANTS = {
    // Vector search parameters
    VECTOR_SEARCH: {
        DEFAULT_MAX_RESULTS: 10,
        DEFAULT_THRESHOLD: 0.6,
        SIMILARITY_THRESHOLD: {
            COSINE: 0.6,
            HYBRID: 0.3,
            DIM_AWARE: 0.1
        },
        EXACT_MATCH_THRESHOLD: 0.65
    },

    // Context extraction parameters
    CONTEXT: {
        CONTENT_LENGTH: {
            MEDIUM_THRESHOLD: 5000,
            HIGH_THRESHOLD: 10000
        },
        MAX_PARENT_DEPTH: 3,
        MAX_CHILDREN: 10,
        MAX_LINKS: 10,
        MAX_SIMILAR_NOTES: 5,
        MAX_CONTENT_LENGTH: 2000,
        MAX_RELATIONS: 10,
        MAX_POINTS: 5
    },

    // Hierarchy parameters
    HIERARCHY: {
        DEFAULT_QUERY_DEPTH: 2,
        MAX_NOTES_PER_QUERY: 10,
        MAX_PATH_LENGTH: 20,
        MAX_BREADTH: 100,
        MAX_DEPTH: 5,
        MAX_PATHS_TO_SHOW: 3
    },

    // Temperature settings
    TEMPERATURE: {
        DEFAULT: 0.7,
        RELATIONSHIP_TOOL: 0.4,
        VECTOR_SEARCH: 0.3,
        QUERY_PROCESSOR: 0.3
    },

    // Token/char limits
    LIMITS: {
        DEFAULT_NOTE_SUMMARY_LENGTH: 500,
        DEFAULT_MAX_TOKENS: 4096,
        RELATIONSHIP_TOOL_MAX_TOKENS: 50,
        VECTOR_SEARCH_MAX_TOKENS: 500,
        QUERY_PROCESSOR_MAX_TOKENS: 300,
        MIN_STRING_LENGTH: 3
    },

    // Tool execution parameters
    TOOL_EXECUTION: {
        MAX_TOOL_CALL_ITERATIONS: 5,
        MAX_FOLLOW_UP_ITERATIONS: 3
    }
};

// Model capabilities constants - moved from ./interfaces/model_capabilities.ts
export const MODEL_CAPABILITIES = {
    'gpt-3.5-turbo': {
        contextWindowTokens: 8192,
        contextWindowChars: 16000
    },
    'gpt-4': {
        contextWindowTokens: 8192
    },
    'gpt-4-turbo': {
        contextWindowTokens: 8192
    },
    'claude-3-opus': {
        contextWindowTokens: 200000
    },
    'claude-3-sonnet': {
        contextWindowTokens: 180000
    },
    'claude-3.5-sonnet': {
        contextWindowTokens: 200000
    },
    'default': {
        contextWindowTokens: 4096
    }
};

// Embedding processing constants
export const EMBEDDING_PROCESSING = {
    MAX_TOTAL_PROCESSING_TIME: 5 * 60 * 1000, // 5 minutes
    MAX_CHUNK_RETRY_ATTEMPTS: 2,
    DEFAULT_MAX_CHUNK_PROCESSING_TIME: 60 * 1000, // 1 minute
    OLLAMA_MAX_CHUNK_PROCESSING_TIME: 120 * 1000, // 2 minutes
    DEFAULT_EMBEDDING_UPDATE_INTERVAL: 200
};

// Provider-specific embedding capabilities
export const PROVIDER_EMBEDDING_CAPABILITIES = {
    VOYAGE: {
        MODELS: {
            'voyage-large-2': {
                contextWidth: 8192,
                dimension: 1536
            },
            'voyage-2': {
                contextWidth: 8192,
                dimension: 1024
            },
            'voyage-lite-02': {
                contextWidth: 8192,
                dimension: 768
            },
            'default': {
                contextWidth: 8192,
                dimension: 1024
            }
        }
    },
    OPENAI: {
        MODELS: {
            'text-embedding-3-small': {
                dimension: 1536,
                contextWindow: 8191
            },
            'text-embedding-3-large': {
                dimension: 3072,
                contextWindow: 8191
            },
            'default': {
                dimension: 1536,
                contextWindow: 8192
            }
        }
    }
};
