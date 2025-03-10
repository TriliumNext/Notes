import { BaseEmbeddingProvider } from "../base_embeddings.js";
import type { EmbeddingConfig } from "../embeddings_interface.js";
import axios from "axios";
import log from "../../../log.js";

interface OpenAIEmbeddingConfig extends EmbeddingConfig {
    apiKey: string;
    baseUrl: string;
}

/**
 * OpenAI embedding provider implementation
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
    name = "openai";
    private apiKey: string;
    private baseUrl: string;

    constructor(config: OpenAIEmbeddingConfig) {
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
                const embedding = response.data.data[0].embedding;
                return new Float32Array(embedding);
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
     * Generate embeddings for multiple texts in a single batch
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        if (texts.length === 0) {
            return [];
        }

        const batchSize = this.config.batchSize || 10;
        const results: Float32Array[] = [];

        // Process in batches to avoid API limits
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            try {
                const response = await axios.post(
                    `${this.baseUrl}/embeddings`,
                    {
                        input: batch,
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

                    results.push(...sortedEmbeddings);
                } else {
                    throw new Error("Unexpected response structure from OpenAI API");
                }
            } catch (error: any) {
                const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
                log.error(`OpenAI batch embedding error: ${errorMessage}`);
                throw new Error(`OpenAI batch embedding error: ${errorMessage}`);
            }
        }

        return results;
    }
}
