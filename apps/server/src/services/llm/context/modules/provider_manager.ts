import options from '../../../options.js';
import log from '../../../log.js';
import { getEmbeddingProvider, getEnabledEmbeddingProviders } from '../../providers/providers.js';

/**
 * Manages embedding providers for context services
 */
export class ProviderManager {
    /**
     * Get the preferred embedding provider based on user settings
     *
     * @returns The preferred embedding provider or null if none available
     */
    async getPreferredEmbeddingProvider(): Promise<any> {
        try {
            // Get the selected embedding provider
            const selectedProvider = await options.getOption('aiEmbeddingProvider');
            if (!selectedProvider) {
                throw new Error('No embedding provider configured. Please set aiEmbeddingProvider option.');
            }
            
            // Try to get the selected provider
            const provider = await getEmbeddingProvider(selectedProvider);
            if (provider) {
                log.info(`Using selected embedding provider: ${selectedProvider}`);
                return provider;
            }

            // If selected provider is not available, throw error
            throw new Error(`Selected embedding provider '${selectedProvider}' is not available. Please check your AI settings.`);
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
