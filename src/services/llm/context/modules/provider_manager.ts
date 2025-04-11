import options from '../../../options.js';
import log from '../../../log.js';
import { getEmbeddingProvider, getEnabledEmbeddingProviders } from '../../providers/providers.js';

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
            // Try to get providers based on precedence list
            const precedenceOption = await options.getOption('embeddingProviderPrecedence');
            let precedenceList: string[] = [];

            if (precedenceOption) {
                if (precedenceOption.startsWith('[') && precedenceOption.endsWith(']')) {
                    precedenceList = JSON.parse(precedenceOption);
                } else if (typeof precedenceOption === 'string') {
                    if (precedenceOption.includes(',')) {
                        precedenceList = precedenceOption.split(',').map(p => p.trim());
                    } else {
                        precedenceList = [precedenceOption];
                    }
                }
            }

            // Try each provider in the precedence list
            for (const providerId of precedenceList) {
                const provider = await getEmbeddingProvider(providerId);
                if (provider) {
                    log.info(`Using embedding provider from precedence list: ${providerId}`);
                    return provider;
                }
            }

            // If no provider from precedence list is available, try any enabled provider
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

            // Generate the embedding
            const embedding = await provider.generateEmbeddings(query);

            if (embedding) {
                // Add the original query as a property to the embedding
                // This is used for title matching in the vector search
                Object.defineProperty(embedding, 'originalQuery', {
                    value: query,
                    writable: false,
                    enumerable: true,
                    configurable: false
                });
            }

            return embedding;
        } catch (error) {
            log.error(`Error generating query embedding: ${error}`);
            return null;
        }
    }
}

// Export singleton instance
export default new ProviderManager();
