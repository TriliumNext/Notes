import axios from "axios";
import log from "../../../log.js";
import { BaseEmbeddingProvider } from "../base_embeddings.js";
import type { EmbeddingConfig } from "../embeddings_interface.js";
import { NormalizationStatus } from "../embeddings_interface.js";
import { LLM_CONSTANTS } from "../../constants/provider_constants.js";
import type { EmbeddingModelInfo } from "../../interfaces/embedding_interfaces.js";

/**
 * OpenAI embedding provider implementation
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
    name = "openai";

    constructor(config: EmbeddingConfig) {
        super(config);
    }

    /**
     * Initialize the provider by detecting model capabilities
     */
    async initialize(): Promise<void> {
        const modelName = this.config.model || "text-embedding-3-small";
        try {
            // Detect model capabilities
            const modelInfo = await this.getModelInfo(modelName);

            // Update the config dimension
            this.config.dimension = modelInfo.dimension;

            log.info(`OpenAI model ${modelName} initialized with dimension ${this.config.dimension} and context window ${modelInfo.contextWidth}`);
        } catch (error: any) {
            log.error(`Error initializing OpenAI provider: ${error.message}`);
        }
    }

    /**
     * Fetch model information from the OpenAI API
     */
    private async fetchModelCapabilities(modelName: string): Promise<EmbeddingModelInfo | null> {
        if (!this.apiKey) {
            return null;
        }

        try {
            // First try to get model details from the models API
            const response = await axios.get(
                `${this.baseUrl}/models/${modelName}`,
                {
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 10000
                }
            );

            if (response.data) {
                // Different model families may have different ways of exposing context window
                let contextWindow = 0;
                let dimension = 0;

                // Extract context window if available
                if (response.data.context_window) {
                    contextWindow = response.data.context_window;
                } else if (response.data.limits && response.data.limits.context_window) {
                    contextWindow = response.data.limits.context_window;
                } else if (response.data.limits && response.data.limits.context_length) {
                    contextWindow = response.data.limits.context_length;
                }

                // Extract embedding dimensions if available
                if (response.data.dimensions) {
                    dimension = response.data.dimensions;
                } else if (response.data.embedding_dimension) {
                    dimension = response.data.embedding_dimension;
                }

                // If we didn't get all the info, use defaults for missing values
                if (!contextWindow) {
                    // Set default context window based on model name patterns
                    if (modelName.includes('ada') || modelName.includes('embedding-ada')) {
                        contextWindow = LLM_CONSTANTS.CONTEXT_WINDOW.OPENAI;
                    } else if (modelName.includes('davinci')) {
                        contextWindow = 8192;
                    } else if (modelName.includes('embedding-3')) {
                        contextWindow = 8191;
                    } else {
                        contextWindow = LLM_CONSTANTS.CONTEXT_WINDOW.OPENAI;
                    }
                }

                if (!dimension) {
                    // Set default dimensions based on model name patterns
                    if (modelName.includes('ada') || modelName.includes('embedding-ada')) {
                        dimension = LLM_CONSTANTS.EMBEDDING_DIMENSIONS.OPENAI.ADA;
                    } else if (modelName.includes('embedding-3-small')) {
                        dimension = 1536;
                    } else if (modelName.includes('embedding-3-large')) {
                        dimension = 3072;
                    } else {
                        dimension = LLM_CONSTANTS.EMBEDDING_DIMENSIONS.OPENAI.DEFAULT;
                    }
                }

                log.info(`Fetched OpenAI model info for ${modelName}: context window ${contextWindow}, dimension ${dimension}`);

                return {
                    name: modelName,
                    dimension,
                    contextWidth: contextWindow,
                    type: 'float32'
                };
            }
        } catch (error: any) {
            log.info(`Could not fetch model info from OpenAI API: ${error.message}. Will try embedding test.`);
        }

        return null;
    }

    /**
     * Get model information including embedding dimensions
     */
    async getModelInfo(modelName: string): Promise<EmbeddingModelInfo> {
        // Check cache first
        if (this.modelInfoCache.has(modelName)) {
            return this.modelInfoCache.get(modelName)!;
        }

        // Try to fetch model capabilities from API
        const apiModelInfo = await this.fetchModelCapabilities(modelName);
        if (apiModelInfo) {
            // Cache and return the API-provided info
            this.modelInfoCache.set(modelName, apiModelInfo);
            this.config.dimension = apiModelInfo.dimension;
            return apiModelInfo;
        }

        // If API info fetch fails, try to detect embedding dimension with a test call
        try {
            const testEmbedding = await this.generateEmbeddings("Test");
            const dimension = testEmbedding.length;

            // Use default context window
            let contextWindow = LLM_CONSTANTS.CONTEXT_WINDOW.OPENAI;

            const modelInfo: EmbeddingModelInfo = {
                name: modelName,
                dimension,
                contextWidth: contextWindow,
                type: 'float32'
            };
            this.modelInfoCache.set(modelName, modelInfo);
            this.config.dimension = dimension;

            log.info(`Detected OpenAI model ${modelName} with dimension ${dimension} (context: ${contextWindow})`);
            return modelInfo;
        } catch (error: any) {
            // If detection fails, use defaults
            const dimension = LLM_CONSTANTS.EMBEDDING_DIMENSIONS.OPENAI.DEFAULT;
            const contextWindow = LLM_CONSTANTS.CONTEXT_WINDOW.OPENAI;

            log.info(`Using default parameters for OpenAI model ${modelName}: dimension ${dimension}, context ${contextWindow}`);

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
     * Generate embeddings for a single text
     */
    async generateEmbeddings(text: string): Promise<Float32Array> {
        try {
            if (!text.trim()) {
                return new Float32Array(this.config.dimension);
            }

            const response = await axios.post(
                `${this.baseUrl}/embeddings`,
                {
                    input: text,
                    model: this.config.model || "text-embedding-3-small",
                    encoding_format: "float"
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${this.apiKey}`
                    }
                }
            );

            if (response.data && response.data.data && response.data.data[0] && response.data.data[0].embedding) {
                return new Float32Array(response.data.data[0].embedding);
            } else {
                throw new Error("Unexpected response structure from OpenAI API");
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
            log.error(`OpenAI embedding error: ${errorMessage}`);
            throw new Error(`OpenAI embedding error: ${errorMessage}`);
        }
    }

    /**
     * More specific implementation of batch size error detection for OpenAI
     */
    protected isBatchSizeError(error: any): boolean {
        const errorMessage = error?.message || error?.response?.data?.error?.message || '';
        const openAIBatchSizeErrorPatterns = [
            'batch size', 'too many inputs', 'context length exceeded',
            'maximum context length', 'token limit', 'rate limit exceeded',
            'tokens in the messages', 'reduce the length', 'too long'
        ];

        return openAIBatchSizeErrorPatterns.some(pattern =>
            errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * Custom implementation for batched OpenAI embeddings
     */
    async generateBatchEmbeddingsWithAPI(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        const response = await axios.post(
            `${this.baseUrl}/embeddings`,
            {
                input: texts,
                model: this.config.model || "text-embedding-3-small",
                encoding_format: "float"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                }
            }
        );

        if (response.data && response.data.data) {
            // Sort the embeddings by index to ensure they match the input order
            const sortedEmbeddings = response.data.data
                .sort((a: any, b: any) => a.index - b.index)
                .map((item: any) => new Float32Array(item.embedding));

            return sortedEmbeddings;
        } else {
            throw new Error("Unexpected response structure from OpenAI API");
        }
    }

    /**
     * Generate embeddings for multiple texts in a single batch
     * OpenAI API supports batch embedding, so we implement a custom version
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        try {
            return await this.processWithAdaptiveBatch(
                texts,
                async (batch) => {
                    // Filter out empty texts and use the API batch functionality
                    const filteredBatch = batch.filter(text => text.trim().length > 0);

                    if (filteredBatch.length === 0) {
                        // If all texts are empty after filtering, return empty embeddings
                        return batch.map(() => new Float32Array(this.config.dimension));
                    }

                    if (filteredBatch.length === 1) {
                        // If only one text, use the single embedding endpoint
                        const embedding = await this.generateEmbeddings(filteredBatch[0]);
                        return [embedding];
                    }

                    // Use the batch API endpoint
                    return this.generateBatchEmbeddingsWithAPI(filteredBatch);
                },
                this.isBatchSizeError
            );
        }
        catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            log.error(`OpenAI batch embedding error: ${errorMessage}`);
            throw new Error(`OpenAI batch embedding error: ${errorMessage}`);
        }
    }

    /**
     * Returns the normalization status for OpenAI embeddings
     * OpenAI embeddings are guaranteed to be normalized to unit length
     */
    getNormalizationStatus(): NormalizationStatus {
        return NormalizationStatus.GUARANTEED;
    }
}
