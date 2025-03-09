import { BaseEmbeddingProvider } from "../base_embeddings.js";
import type { EmbeddingConfig } from "../embeddings_interface.js";
import axios from "axios";
import log from "../../../log.js";

interface AnthropicEmbeddingConfig extends EmbeddingConfig {
    apiKey: string;
    baseUrl: string;
}

/**
 * Anthropic (Claude) embedding provider implementation
 */
export class AnthropicEmbeddingProvider extends BaseEmbeddingProvider {
    name = "anthropic";
    private apiKey: string;
    private baseUrl: string;

    constructor(config: AnthropicEmbeddingConfig) {
        super(config);
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl;
    }

    /**
     * Generate embeddings for a single text
     */
    async generateEmbeddings(text: string): Promise<Float32Array> {
        try {
            const response = await axios.post(
                `${this.baseUrl}/embeddings`,
                {
                    model: this.config.model || "claude-3-haiku-20240307",
                    input: text,
                    encoding_format: "float"
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "x-api-key": this.apiKey,
                        "anthropic-version": "2023-06-01"
                    }
                }
            );

            if (response.data && response.data.embedding) {
                const embedding = response.data.embedding;
                return new Float32Array(embedding);
            } else {
                throw new Error("Unexpected response structure from Anthropic API");
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
            log.error(`Anthropic embedding error: ${errorMessage}`);
            throw new Error(`Anthropic embedding error: ${errorMessage}`);
        }
    }

    /**
     * Generate embeddings for multiple texts in a single batch
     *
     * Note: Anthropic doesn't currently support batch embedding, so we process each text individually
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        const results: Float32Array[] = [];

        for (const text of texts) {
            const embedding = await this.generateEmbeddings(text);
            results.push(embedding);
        }

        return results;
    }
}
