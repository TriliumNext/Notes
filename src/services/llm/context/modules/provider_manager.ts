import options from '../../../options.js';
import log from '../../../log.js';
import { getEmbeddingProvider, getEnabledEmbeddingProviders } from '../../embeddings/providers.js';

/**
 * Manages embedding providers for context services
 */
export class ProviderManager {
    /**
     * Get the preferred embedding provider based on user settings
     * Tries to use the most appropriate provider in this order:
     * 1. User's configured default provider
     * 2. OpenAI if API key is set
     * 3. Anthropic if API key is set
     * 4. Ollama if configured
     * 5. Any available provider
     * 6. Local provider as fallback
     *
     * @returns The preferred embedding provider or null if none available
     */
    async getPreferredEmbeddingProvider(): Promise<any> {
        try {
            // First try user's configured default provider
            const providerId = await options.getOption('embeddingsDefaultProvider');
            if (providerId) {
                const provider = await getEmbeddingProvider(providerId);
                if (provider) {
                    log.info(`Using configured embedding provider: ${providerId}`);
                    return provider;
                }
            }

            // Then try OpenAI
            const openaiKey = await options.getOption('openaiApiKey');
            if (openaiKey) {
                const provider = await getEmbeddingProvider('openai');
                if (provider) {
                    log.info('Using OpenAI embeddings provider');
                    return provider;
                }
            }

            // Try Anthropic
            const anthropicKey = await options.getOption('anthropicApiKey');
            if (anthropicKey) {
                const provider = await getEmbeddingProvider('anthropic');
                if (provider) {
                    log.info('Using Anthropic embeddings provider');
                    return provider;
                }
            }

            // Try Ollama
            const provider = await getEmbeddingProvider('ollama');
            if (provider) {
                log.info('Using Ollama embeddings provider');
                return provider;
            }

            // If no preferred providers, get any enabled provider
            const providers = await getEnabledEmbeddingProviders();
            if (providers.length > 0) {
                log.info(`Using available embedding provider: ${providers[0].name}`);
                return providers[0];
            }

            // Last resort is local provider
            log.info('Using local embedding provider as fallback');
            return await getEmbeddingProvider('local');
        } catch (error) {
            log.error(`Error getting preferred embedding provider: ${error}`);
            return null;
        }
    }

    /**
     * Generate embeddings for a text query
     *
     * @param query - The text query to embed
     * @returns The generated embedding or null if failed
     */
    async generateQueryEmbedding(query: string): Promise<Float32Array | null> {
        try {
            // Get the preferred embedding provider
            const provider = await this.getPreferredEmbeddingProvider();
            if (!provider) {
                log.error('No embedding provider available');
                return null;
            }
            return await provider.generateEmbeddings(query);
        } catch (error) {
            log.error(`Error generating query embedding: ${error}`);
            return null;
        }
    }
}

// Export singleton instance
export default new ProviderManager();
