export const PROVIDER_CONSTANTS = {
    ANTHROPIC: {
        API_VERSION: '2023-06-01',
        BETA_VERSION: 'messages-2023-12-15',
        BASE_URL: 'https://api.anthropic.com',
        DEFAULT_MODEL: 'claude-3-haiku-20240307',
        // Model mapping for simplified model names to their full versions
        MODEL_MAPPING: {
            'claude-3.7-sonnet': 'claude-3-7-sonnet-20250219',
            'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
            'claude-3.5-haiku': 'claude-3-5-haiku-20241022',
            'claude-3-opus': 'claude-3-opus-20240229',
            'claude-3-sonnet': 'claude-3-sonnet-20240229',
            'claude-3-haiku': 'claude-3-haiku-20240307',
            'claude-2': 'claude-2.1'
        },
        // These are the currently available models from Anthropic
        AVAILABLE_MODELS: [
            {
                id: 'claude-3-7-sonnet-20250219',
                name: 'Claude 3.7 Sonnet',
                description: 'Most intelligent model with hybrid reasoning capabilities',
                maxTokens: 8192
            },
            {
                id: 'claude-3-5-sonnet-20241022',
                name: 'Claude 3.5 Sonnet',
                description: 'High level of intelligence and capability',
                maxTokens: 8192
            },
            {
                id: 'claude-3-5-haiku-20241022',
                name: 'Claude 3.5 Haiku',
                description: 'Fastest model with high intelligence',
                maxTokens: 8192
            },
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                description: 'Most capable model for highly complex tasks',
                maxTokens: 8192
            },
            {
                id: 'claude-3-sonnet-20240229',
                name: 'Claude 3 Sonnet',
                description: 'Ideal balance of intelligence and speed',
                maxTokens: 8192
            },
            {
                id: 'claude-3-haiku-20240307',
                name: 'Claude 3 Haiku',
                description: 'Fastest and most compact model',
                maxTokens: 8192
            },
            {
                id: 'claude-2.1',
                name: 'Claude 2.1',
                description: 'Previous generation model',
                maxTokens: 8192
            }
        ]
    },

    OPENAI: {
        BASE_URL: 'https://api.openai.com/v1',
        DEFAULT_MODEL: 'gpt-3.5-turbo',
        DEFAULT_EMBEDDING_MODEL: 'text-embedding-ada-002',
        CONTEXT_WINDOW: 16000,
        EMBEDDING_DIMENSIONS: {
            ADA: 1536,
            DEFAULT: 1536
        },
        AVAILABLE_MODELS: [
            {
                id: 'gpt-4o',
                name: 'GPT-4o',
                description: 'Most capable multimodal model',
                maxTokens: 8192
            },
            {
                id: 'gpt-4-turbo',
                name: 'GPT-4 Turbo',
                description: 'Advanced capabilities with higher token limit',
                maxTokens: 8192
            },
            {
                id: 'gpt-4',
                name: 'GPT-4',
                description: 'Original GPT-4 model',
                maxTokens: 8192
            },
            {
                id: 'gpt-3.5-turbo',
                name: 'GPT-3.5 Turbo',
                description: 'Fast and efficient model for most tasks',
                maxTokens: 8192
            }
        ]
    },

    OLLAMA: {
        BASE_URL: 'http://localhost:11434',
        DEFAULT_MODEL: 'llama2',
        BATCH_SIZE: 100,
        CHUNKING: {
            SIZE: 4000,
            OVERLAP: 200
        },
        MODEL_DIMENSIONS: {
            default: 8192,
            llama2: 8192,
            mixtral: 8192,
            'mistral': 8192
        },
        MODEL_CONTEXT_WINDOWS: {
            default: 8192,
            llama2: 8192,
            mixtral: 8192,
            'mistral': 8192
        }
    }
} as const;

// LLM service configuration constants
export const LLM_CONSTANTS = {
    // Context window sizes (in characters)
    CONTEXT_WINDOW: {
        OLLAMA: 8000,
        OPENAI: 12000,
        ANTHROPIC: 15000,
        VOYAGE: 12000,
        DEFAULT: 6000
    },

    // Embedding dimensions (verify these with your actual models)
    EMBEDDING_DIMENSIONS: {
        OLLAMA: {
            DEFAULT: 384,
            NOMIC: 768,
            MISTRAL: 1024
        },
        OPENAI: {
            ADA: 1536,
            DEFAULT: 1536
        },
        ANTHROPIC: {
            CLAUDE: 1024,
            DEFAULT: 1024
        },
        VOYAGE: {
            DEFAULT: 1024
        }
    },

    // Model-specific embedding dimensions for Ollama models
    OLLAMA_MODEL_DIMENSIONS: {
        "llama3": 8192,
        "llama3.1": 8192,
        "mistral": 8192,
        "nomic": 768,
        "mxbai": 1024,
        "nomic-embed-text": 768,
        "mxbai-embed-large": 1024,
        "default": 384
    },

    // Model-specific context windows for Ollama models
    OLLAMA_MODEL_CONTEXT_WINDOWS: {
        "llama3": 8192,
        "llama3.1": 8192,
        "llama3.2": 8192,
        "mistral": 8192,
        "nomic": 32768,
        "mxbai": 32768,
        "nomic-embed-text": 32768,
        "mxbai-embed-large": 32768,
        "default": 8192
    },

    // Batch size configuration
    BATCH_SIZE: {
        OPENAI: 10,     // OpenAI can handle larger batches efficiently
        ANTHROPIC: 5,   // More conservative for Anthropic
        OLLAMA: 1,      // Ollama processes one at a time
        DEFAULT: 5      // Conservative default
    },

    // Chunking parameters
    CHUNKING: {
        DEFAULT_SIZE: 1500,
        OLLAMA_SIZE: 1000,
        DEFAULT_OVERLAP: 100,
        MAX_SIZE_FOR_SINGLE_EMBEDDING: 5000
    },

    // Search/similarity thresholds
    SIMILARITY: {
        DEFAULT_THRESHOLD: 0.65,
        HIGH_THRESHOLD: 0.75,
        LOW_THRESHOLD: 0.5
    },

    // Session management
    SESSION: {
        CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
        SESSION_EXPIRY_MS: 12 * 60 * 60 * 1000, // 12 hours
        MAX_SESSION_MESSAGES: 10
    },

    // Content limits
    CONTENT: {
        MAX_NOTE_CONTENT_LENGTH: 1500,
        MAX_TOTAL_CONTENT_LENGTH: 10000
    }
};
