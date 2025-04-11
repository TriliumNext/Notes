import log from '../log.js';
import type { ModelCapabilities } from './interfaces/model_capabilities.js';
import { MODEL_CAPABILITIES, DEFAULT_MODEL_CAPABILITIES } from './interfaces/model_capabilities.js';
import aiServiceManager from './ai_service_manager.js';
import { getEmbeddingProvider } from './providers/providers.js';
import type { BaseEmbeddingProvider } from './embeddings/base_embeddings.js';
import type { EmbeddingModelInfo } from './interfaces/embedding_interfaces.js';

// Define a type for embedding providers that might have the getModelInfo method
interface EmbeddingProviderWithModelInfo {
    getModelInfo?: (modelName: string) => Promise<EmbeddingModelInfo>;
}

/**
 * Service for fetching and caching model capabilities
 */
export class ModelCapabilitiesService {
    // Cache model capabilities
    private capabilitiesCache: Map<string, ModelCapabilities> = new Map();

    constructor() {
        // Initialize cache with known models
        this.initializeCache();
    }

    /**
     * Initialize the cache with known model capabilities
     */
    private initializeCache() {
        // Add all predefined model capabilities to cache
        for (const [model, capabilities] of Object.entries(MODEL_CAPABILITIES)) {
            this.capabilitiesCache.set(model, {
                ...DEFAULT_MODEL_CAPABILITIES,
                ...capabilities
            });
        }
    }

    /**
     * Get model capabilities, fetching from provider if needed
     *
     * @param modelName Full model name (with or without provider prefix)
     * @returns Model capabilities
     */
    async getModelCapabilities(modelName: string): Promise<ModelCapabilities> {
        // Handle provider-prefixed model names (e.g., "openai:gpt-4")
        let provider = 'default';
        let baseModelName = modelName;

        if (modelName.includes(':')) {
            const parts = modelName.split(':');
            provider = parts[0];
            baseModelName = parts[1];
        }

        // Check cache first
        const cacheKey = baseModelName;
        if (this.capabilitiesCache.has(cacheKey)) {
            return this.capabilitiesCache.get(cacheKey)!;
        }

        // Fetch from provider if possible
        try {
            // Get provider service
            const providerService = aiServiceManager.getService(provider);

            if (providerService && typeof (providerService as any).getModelCapabilities === 'function') {
                // If provider supports direct capability fetching, use it
                const capabilities = await (providerService as any).getModelCapabilities(baseModelName);

                if (capabilities) {
                    // Merge with defaults and cache
                    const fullCapabilities = {
                        ...DEFAULT_MODEL_CAPABILITIES,
                        ...capabilities
                    };

                    this.capabilitiesCache.set(cacheKey, fullCapabilities);
                    log.info(`Fetched capabilities for ${modelName}: context window ${fullCapabilities.contextWindowTokens} tokens`);

                    return fullCapabilities;
                }
            }

            // Try to fetch from embedding provider if available
            const embeddingProvider = getEmbeddingProvider(provider);

            if (embeddingProvider) {
                try {
                    // Cast to a type that might have getModelInfo method
                    const providerWithModelInfo = embeddingProvider as unknown as EmbeddingProviderWithModelInfo;

                    if (providerWithModelInfo.getModelInfo) {
                        const modelInfo = await providerWithModelInfo.getModelInfo(baseModelName);

                        if (modelInfo && modelInfo.contextWidth) {
                            // Convert to our capabilities format
                            const capabilities: ModelCapabilities = {
                                ...DEFAULT_MODEL_CAPABILITIES,
                                contextWindowTokens: modelInfo.contextWidth,
                                contextWindowChars: modelInfo.contextWidth * 4 // Rough estimate: 4 chars per token
                            };

                            this.capabilitiesCache.set(cacheKey, capabilities);
                            log.info(`Derived capabilities for ${modelName} from embedding provider: context window ${capabilities.contextWindowTokens} tokens`);

                            return capabilities;
                        }
                    }
                } catch (error) {
                    log.info(`Could not get model info from embedding provider for ${modelName}: ${error}`);
                }
            }
        } catch (error) {
            log.error(`Error fetching model capabilities for ${modelName}: ${error}`);
        }

        // If we get here, try to find a similar model in our predefined list
        for (const knownModel of Object.keys(MODEL_CAPABILITIES)) {
            // Check if the model name contains this known model (e.g., "gpt-4-1106-preview" contains "gpt-4")
            if (baseModelName.includes(knownModel)) {
                const capabilities = {
                    ...DEFAULT_MODEL_CAPABILITIES,
                    ...MODEL_CAPABILITIES[knownModel]
                };

                this.capabilitiesCache.set(cacheKey, capabilities);
                log.info(`Using similar model (${knownModel}) capabilities for ${modelName}`);

                return capabilities;
            }
        }

        // Fall back to defaults if nothing else works
        log.info(`Using default capabilities for unknown model ${modelName}`);
        this.capabilitiesCache.set(cacheKey, DEFAULT_MODEL_CAPABILITIES);

        return DEFAULT_MODEL_CAPABILITIES;
    }

    /**
     * Update model capabilities in the cache
     *
     * @param modelName Model name
     * @param capabilities Capabilities to update
     */
    updateModelCapabilities(modelName: string, capabilities: Partial<ModelCapabilities>) {
        const currentCapabilities = this.capabilitiesCache.get(modelName) || DEFAULT_MODEL_CAPABILITIES;

        this.capabilitiesCache.set(modelName, {
            ...currentCapabilities,
            ...capabilities
        });
    }
}

// Create and export singleton instance
const modelCapabilitiesService = new ModelCapabilitiesService();
export default modelCapabilitiesService;
