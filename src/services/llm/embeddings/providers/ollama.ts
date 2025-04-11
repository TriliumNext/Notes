import log from "../../../log.js";
import { BaseEmbeddingProvider } from "../base_embeddings.js";
import type { EmbeddingConfig } from "../embeddings_interface.js";
import { NormalizationStatus } from "../embeddings_interface.js";
import { LLM_CONSTANTS } from "../../constants/provider_constants.js";
import type { EmbeddingModelInfo } from "../../interfaces/embedding_interfaces.js";
import { Ollama } from "ollama";

/**
 * Ollama embedding provider implementation using the official Ollama client
 */
export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
    name = "ollama";
    private client: Ollama | null = null;

    constructor(config: EmbeddingConfig) {
        super(config);
    }

    /**
     * Get the Ollama client instance
     */
    private getClient(): Ollama {
        if (!this.client) {
            this.client = new Ollama({ host: this.baseUrl });
        }
        return this.client;
    }

    /**
     * Initialize the provider by detecting model capabilities
     */
    async initialize(): Promise<void> {
        const modelName = this.config.model || "llama3";
        try {
            // Detect model capabilities
            const modelInfo = await this.getModelInfo(modelName);

            // Update the config dimension
            this.config.dimension = modelInfo.dimension;

            log.info(`Ollama model ${modelName} initialized with dimension ${this.config.dimension} and context window ${modelInfo.contextWidth}`);
        } catch (error: any) {
            log.error(`Error initializing Ollama provider: ${error.message}`);
        }
    }

    /**
     * Fetch detailed model information from Ollama API
     * @param modelName The name of the model to fetch information for
     */
    private async fetchModelCapabilities(modelName: string): Promise<EmbeddingModelInfo | null> {
        try {
            const client = this.getClient();
            
            // Get model info using the client's show method
            const modelData = await client.show({ model: modelName });

            if (modelData && modelData.parameters) {
                const params = modelData.parameters as any;
                // Extract context length from parameters (different models might use different parameter names)
                const contextWindow = params.context_length ||
                                     params.num_ctx ||
                                     params.context_window ||
                                     (LLM_CONSTANTS.OLLAMA_MODEL_CONTEXT_WINDOWS as Record<string, number>).default;

                // Some models might provide embedding dimensions
                const embeddingDimension = params.embedding_length || params.dim || null;

                log.info(`Fetched Ollama model info for ${modelName}: context window ${contextWindow}`);

                return {
                    name: modelName,
                    dimension: embeddingDimension || 0, // We'll detect this separately if not provided
                    contextWidth: contextWindow,
                    type: 'float32'
                };
            }
        } catch (error: any) {
            log.info(`Could not fetch model info from Ollama API: ${error.message}. Will try embedding test.`);
            // We'll fall back to embedding test if this fails
        }

        return null;
    }

    /**
     * Get model information by probing the API
     */
    async getModelInfo(modelName: string): Promise<EmbeddingModelInfo> {
        // Check cache first
        if (this.modelInfoCache.has(modelName)) {
            return this.modelInfoCache.get(modelName)!;
        }

        // Try to fetch model capabilities from API
        const apiModelInfo = await this.fetchModelCapabilities(modelName);
        if (apiModelInfo) {
            // If we have context window but no embedding dimension, we need to detect the dimension
            if (apiModelInfo.contextWidth && !apiModelInfo.dimension) {
                try {
                    // Detect dimension with a test embedding
                    const dimension = await this.detectEmbeddingDimension(modelName);
                    apiModelInfo.dimension = dimension;
                } catch (error) {
                    // If dimension detection fails, fall back to defaults
                    const baseModelName = modelName.split(':')[0];
                    apiModelInfo.dimension = (LLM_CONSTANTS.OLLAMA_MODEL_DIMENSIONS as Record<string, number>)[baseModelName] ||
                                           (LLM_CONSTANTS.OLLAMA_MODEL_DIMENSIONS as Record<string, number>).default;
                }
            }

            // Cache and return the API-provided info
            this.modelInfoCache.set(modelName, apiModelInfo);
            this.config.dimension = apiModelInfo.dimension;
            return apiModelInfo;
        }

        // If API info fetch fails, fall back to test embedding
        try {
            const dimension = await this.detectEmbeddingDimension(modelName);
            const baseModelName = modelName.split(':')[0];
            const contextWindow = (LLM_CONSTANTS.OLLAMA_MODEL_CONTEXT_WINDOWS as Record<string, number>)[baseModelName] ||
                                (LLM_CONSTANTS.OLLAMA_MODEL_CONTEXT_WINDOWS as Record<string, number>).default;

            const modelInfo: EmbeddingModelInfo = {
                name: modelName,
                dimension,
                contextWidth: contextWindow,
                type: 'float32'
            };
            this.modelInfoCache.set(modelName, modelInfo);
            this.config.dimension = dimension;

            log.info(`Detected Ollama model ${modelName} with dimension ${dimension} (context: ${contextWindow})`);
            return modelInfo;
        } catch (error: any) {
            log.error(`Error detecting Ollama model capabilities: ${error.message}`);

            // If all detection fails, use defaults based on model name
            const baseModelName = modelName.split(':')[0];
            const dimension = (LLM_CONSTANTS.OLLAMA_MODEL_DIMENSIONS as Record<string, number>)[baseModelName] ||
                            (LLM_CONSTANTS.OLLAMA_MODEL_DIMENSIONS as Record<string, number>).default;
            const contextWindow = (LLM_CONSTANTS.OLLAMA_MODEL_CONTEXT_WINDOWS as Record<string, number>)[baseModelName] ||
                                (LLM_CONSTANTS.OLLAMA_MODEL_CONTEXT_WINDOWS as Record<string, number>).default;

            log.info(`Using default parameters for model ${modelName}: dimension ${dimension}, context ${contextWindow}`);

            const modelInfo: EmbeddingModelInfo = {
                name: modelName,
                dimension,
                contextWidth: contextWindow,
                type: 'float32'
            };
            this.modelInfoCache.set(modelName, modelInfo);
            this.config.dimension = dimension;

            return modelInfo;
        }
    }

    /**
     * Detect embedding dimension by making a test API call
     */
    private async detectEmbeddingDimension(modelName: string): Promise<number> {
        try {
            const client = this.getClient();
            const embedResponse = await client.embeddings({
                model: modelName,
                prompt: "Test"
            });
            
            if (embedResponse && Array.isArray(embedResponse.embedding)) {
                return embedResponse.embedding.length;
            } else {
                throw new Error("Could not detect embedding dimensions");
            }
        } catch (error) {
            throw new Error(`Failed to detect embedding dimensions: ${error}`);
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
        // Handle empty text
        if (!text.trim()) {
            return new Float32Array(this.config.dimension);
        }

        // Configuration for retries
        const maxRetries = 3;
        let retryCount = 0;
        let lastError: any = null;

        while (retryCount <= maxRetries) {
            try {
                const modelName = this.config.model || "llama3";

                // Ensure we have model info
                const modelInfo = await this.getModelInfo(modelName);

                // Trim text if it might exceed context window (rough character estimate)
                // This is a simplistic approach - ideally we'd count tokens properly
                const charLimit = (modelInfo.contextWidth || 8192) * 4; // Rough estimate: avg 4 chars per token
                const trimmedText = text.length > charLimit ? text.substring(0, charLimit) : text;

                const client = this.getClient();
                const response = await client.embeddings({
                    model: modelName,
                    prompt: trimmedText
                });

                if (response && Array.isArray(response.embedding)) {
                    // Success! Return the embedding
                    return new Float32Array(response.embedding);
                } else {
                    throw new Error("Unexpected response structure from Ollama API");
                }
            } catch (error: any) {
                lastError = error;
                // Only retry on timeout or connection errors
                const errorMessage = error.message || "Unknown error";
                const isTimeoutError = errorMessage.includes('timeout') ||
                                     errorMessage.includes('socket hang up') ||
                                     errorMessage.includes('ECONNREFUSED') ||
                                     errorMessage.includes('ECONNRESET') ||
                                     errorMessage.includes('AbortError') ||
                                     errorMessage.includes('NetworkError');

                if (isTimeoutError && retryCount < maxRetries) {
                    // Exponential backoff with jitter
                    const delay = Math.min(Math.pow(2, retryCount) * 1000 + Math.random() * 1000, 15000);
                    log.info(`Ollama embedding timeout, retrying in ${Math.round(delay/1000)}s (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retryCount++;
                } else {
                    // Non-retryable error or max retries exceeded
                    const errorMessage = error.message || "Unknown error";
                    log.error(`Ollama embedding error: ${errorMessage}`);
                    throw new Error(`Ollama embedding error: ${errorMessage}`);
                }
            }
        }

        // If we get here, we've exceeded our retry limit
        const errorMessage = lastError.message || "Unknown error";
        log.error(`Ollama embedding error after ${maxRetries} retries: ${errorMessage}`);
        throw new Error(`Ollama embedding error after ${maxRetries} retries: ${errorMessage}`);
    }

    /**
     * More specific implementation of batch size error detection for Ollama
     */
    protected isBatchSizeError(error: any): boolean {
        const errorMessage = error?.message || '';
        const ollamaBatchSizeErrorPatterns = [
            'context length', 'token limit', 'out of memory',
            'too large', 'overloaded', 'prompt too long',
            'too many tokens', 'maximum size'
        ];

        return ollamaBatchSizeErrorPatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * Generate embeddings for multiple texts
     *
     * Note: Ollama API doesn't support batch embedding, so we process them sequentially
     * but using the adaptive batch processor to handle rate limits and retries
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        try {
            return await this.processWithAdaptiveBatch(
                texts,
                async (batch) => {
                    const results: Float32Array[] = [];

                    // For Ollama, we have to process one at a time
                    for (const text of batch) {
                        // Skip empty texts
                        if (!text.trim()) {
                            results.push(new Float32Array(this.config.dimension));
                            continue;
                        }

                        const embedding = await this.generateEmbeddings(text);
                        results.push(embedding);
                    }

                    return results;
                },
                this.isBatchSizeError
            );
        }
        catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            log.error(`Ollama batch embedding error: ${errorMessage}`);
            throw new Error(`Ollama batch embedding error: ${errorMessage}`);
        }
    }

    /**
     * Returns the normalization status for Ollama embeddings
     * Ollama embeddings are not guaranteed to be normalized
     */
    getNormalizationStatus(): NormalizationStatus {
        return NormalizationStatus.NEVER; // Be conservative and always normalize
    }
}
