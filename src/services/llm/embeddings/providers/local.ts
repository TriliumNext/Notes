import { BaseEmbeddingProvider } from "../base_embeddings.js";
import type { EmbeddingConfig } from "../embeddings_interface.js";
import crypto from "crypto";

/**
 * Local embedding provider implementation
 *
 * This is a fallback provider that generates simple deterministic embeddings
 * using cryptographic hashing. These are not semantic vectors but can be used
 * for exact matches when no other providers are available.
 */
export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
    name = "local";

    constructor(config: EmbeddingConfig) {
        super(config);
    }

    /**
     * Generate a simple embedding by hashing the text
     */
    async generateEmbeddings(text: string): Promise<Float32Array> {
        const dimension = this.config.dimension || 384;
        const result = new Float32Array(dimension);

        // Generate a hash of the input text
        const hash = crypto.createHash('sha256').update(text).digest();

        // Use the hash to seed a deterministic PRNG
        let seed = 0;
        for (let i = 0; i < hash.length; i += 4) {
            seed = (seed * 65536 + hash.readUInt32LE(i % (hash.length - 3))) >>> 0;
        }

        // Generate pseudo-random but deterministic values for the embedding
        for (let i = 0; i < dimension; i++) {
            // Generate next pseudo-random number
            seed = (seed * 1664525 + 1013904223) >>> 0;

            // Convert to a float between -1 and 1
            result[i] = (seed / 2147483648) - 1;
        }

        // Normalize the vector
        let magnitude = 0;
        for (let i = 0; i < dimension; i++) {
            magnitude += result[i] * result[i];
        }

        magnitude = Math.sqrt(magnitude);
        if (magnitude > 0) {
            for (let i = 0; i < dimension; i++) {
                result[i] /= magnitude;
            }
        }

        return result;
    }

    /**
     * Generate embeddings for multiple texts
     */
    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        const results: Float32Array[] = [];

        for (const text of texts) {
            const embedding = await this.generateEmbeddings(text);
            results.push(embedding);
        }

        return results;
    }
}
