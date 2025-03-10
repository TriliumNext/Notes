import { BaseEmbeddingProvider } from "../base_embeddings.js";
import type { EmbeddingConfig } from "../embeddings_interface.js";
import axios from "axios";
import log from "../../../log.js";

interface OllamaEmbeddingConfig extends EmbeddingConfig {
    baseUrl: string;
}

// Model-specific embedding dimensions
interface EmbeddingModelInfo {
    dimension: number;
    contextWindow: number;
}

/**
 * Ollama embedding provider implementation
 */
export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
    name = "ollama";
    private baseUrl: string;
    // Cache for model dimensions to avoid repeated API calls
    private modelInfoCache = new Map<string, EmbeddingModelInfo>();

    constructor(config: OllamaEmbeddingConfig) {
        super(config);
        this.baseUrl = config.baseUrl;
    }

    /**
     * Initialize the provider by detecting model capabilities
     */
    async initialize(): Promise<void> {
        const modelName = this.config.model || "llama3";
        try {
            await this.getModelInfo(modelName);
            log.info(`Ollama embedding provider initialized with model ${modelName}`);
        } catch (error: any) {
            log.error(`Failed to initialize Ollama embedding provider: ${error.message}`);
            // Still continue with default dimensions
        }
    }

    /**
     * Get model information including embedding dimensions
     */
    async getModelInfo(modelName: string): Promise<EmbeddingModelInfo> {
        // Check cache first
        if (this.modelInfoCache.has(modelName)) {
            return this.modelInfoCache.get(modelName)!;
        }

        // Default dimensions for common embedding models
        const defaultDimensions: Record<string, number> = {
            "nomic-embed-text": 768,
            "mxbai-embed-large": 1024,
            "llama3": 4096,
            "all-minilm": 384,
            "default": 4096
        };

        // Default context windows
        const defaultContextWindows: Record<string, number> = {
            "nomic-embed-text": 8192,
            "mxbai-embed-large": 8192,
            "llama3": 8192,
            "all-minilm": 4096,
            "default": 4096
        };

        try {
            // Try to detect if this is an embedding model
            const testResponse = await axios.post(
                `${this.baseUrl}/api/embeddings`,
                {
                    model: modelName,
                    prompt: "Test"
                },
                {
                    headers: { "Content-Type": "application/json" },
                    timeout: 10000
                }
            );

            let dimension = 0;
            let contextWindow = 0;

            if (testResponse.data && Array.isArray(testResponse.data.embedding)) {
                dimension = testResponse.data.embedding.length;

                // Set context window based on model name if we have it
                const baseModelName = modelName.split(':')[0];
                contextWindow = defaultContextWindows[baseModelName] || defaultContextWindows.default;

                log.info(`Detected Ollama model ${modelName} with dimension ${dimension}`);
            } else {
                throw new Error("Could not detect embedding dimensions");
            }

            const modelInfo: EmbeddingModelInfo = { dimension, contextWindow };
            this.modelInfoCache.set(modelName, modelInfo);

            // Update the provider config dimension
            this.config.dimension = dimension;

            return modelInfo;
        } catch (error: any) {
            log.error(`Error detecting Ollama model capabilities: ${error.message}`);

            // If detection fails, use defaults based on model name
            const baseModelName = modelName.split(':')[0];
            const dimension = defaultDimensions[baseModelName] || defaultDimensions.default;
            const contextWindow = defaultContextWindows[baseModelName] || defaultContextWindows.default;

            log.info(`Using default dimension ${dimension} for model ${modelName}`);

            const modelInfo: EmbeddingModelInfo = { dimension, contextWindow };
            this.modelInfoCache.set(modelName, modelInfo);

            // Update the provider config dimension
            this.config.dimension = dimension;

            return modelInfo;
        }
    }

    /**
     * Get the current embedding dimension
     */
    getDimension(): number {
        return this.config.dimension;
    }

    /**
     * Generate embeddings for a single text
     */
    async generateEmbeddings(text: string): Promise<Float32Array> {
        try {
            const modelName = this.config.model || "llama3";

            // Ensure we have model info
            const modelInfo = await this.getModelInfo(modelName);

            // Trim text if it might exceed context window (rough character estimate)
            // This is a simplistic approach - ideally we'd count tokens properly
            const charLimit = modelInfo.contextWindow * 4; // Rough estimate: avg 4 chars per token
            const trimmedText = text.length > charLimit ? text.substring(0, charLimit) : text;

            const response = await axios.post(
                `${this.baseUrl}/api/embeddings`,
                {
                    model: modelName,
                    prompt: trimmedText,
                    format: "json"
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    timeout: 30000 // Longer timeout for larger texts
                }
            );

            if (response.data && Array.isArray(response.data.embedding)) {
                return new Float32Array(response.data.embedding);
            } else {
                throw new Error("Unexpected response structure from Ollama API");
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
            log.error(`Ollama embedding error: ${errorMessage}`);
            throw new Error(`Ollama embedding error: ${errorMessage}`);
        }
    }

    /**
     * Generate embeddings for multiple texts
     *
     * Note: Ollama API doesn't support batch embedding, so we process them sequentially
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        const results: Float32Array[] = [];

        for (const text of texts) {
            try {
                const embedding = await this.generateEmbeddings(text);
                results.push(embedding);
            } catch (error: any) {
                const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
                log.error(`Ollama batch embedding error: ${errorMessage}`);
                throw new Error(`Ollama batch embedding error: ${errorMessage}`);
            }
        }

        return results;
    }
}
