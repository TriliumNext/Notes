import options from '../../../options.js';
import log from '../../../log.js';
import { getEmbeddingProvider, getEnabledEmbeddingProviders } from '../../embeddings/providers.js';

/**
 * Manages embedding providers for context services
 */
export class ProviderManager {
    /**
     * Get the preferred embedding provider based on user settings
     * Uses the embeddingProviderPrecedence setting to determine the order
     *
     * @returns The preferred embedding provider or null if none available
     */
    async getPreferredEmbeddingProvider(): Promise<any> {
        try {
            // Get all enabled providers
            const enabledProviders = await getEnabledEmbeddingProviders();

            if (enabledProviders.length === 0) {
                log.info('No embedding providers are enabled');
                return null;
            }

            // Get the provider precedence from settings
            const precedenceOption = await options.getOption('embeddingProviderPrecedence');
            let precedenceList: string[] = [];

            if (precedenceOption) {
                if (precedenceOption.includes(',')) {
                    precedenceList = precedenceOption.split(',').map(p => p.trim());
                } else {
                    precedenceList = [precedenceOption];
                }
            }

            // Try to find first enabled provider from precedence list
            if (precedenceList.length > 0) {
                for (const providerName of precedenceList) {
                    const matchedProvider = enabledProviders.find(p => p.name === providerName);
                    if (matchedProvider) {
                        log.info(`Using preferred embedding provider: ${matchedProvider.name}`);
                        return matchedProvider;
                    }
                }
            }

            // Otherwise use the first enabled provider
            log.info(`Using available embedding provider: ${enabledProviders[0].name}`);
            return enabledProviders[0];
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
