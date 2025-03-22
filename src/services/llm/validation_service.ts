import options from "../options.js";
import log from "../log.js";
import providerManager from "./embeddings/providers.js";
import type { EmbeddingProvider } from "./embeddings/embeddings_interface.js";

// Interface for validation errors
export interface ValidationError {
    provider: string;
    type: 'missing_api_key' | 'not_available' | 'missing_from_precedence' | 'connection_error' | 'other';
    message: string;
}

/**
 * AI Provider Validation Service
 *
 * This service validates AI and LLM provider configurations to ensure they're
 * properly set up before use, rather than waiting for runtime errors.
 */
class ValidationService {
    /**
     * Get all validation errors for AI/LLM configurations
     */
    async getValidationErrors(): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // Skip all checks if AI is disabled
        if (!(await options.getOptionBool('aiEnabled'))) {
            return errors;
        }

        // Check embedding providers
        const embeddingErrors = await this.validateEmbeddingProviders();
        errors.push(...embeddingErrors);

        // Check LLM providers (future implementation)
        // const llmErrors = await this.validateLLMProviders();
        // errors.push(...llmErrors);

        return errors;
    }

    /**
     * Validate embedding provider configurations
     */
    async validateEmbeddingProviders(): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // Get provider precedence from options
        const embeddingPrecedenceStr = await options.getOption('embeddingProviderPrecedence') || '';
        const aiPrecedenceStr = await options.getOption('aiProviderPrecedence') || '';
        const defaultProvider = await options.getOption('embeddingsDefaultProvider') || 'openai';

        // Parse embedding provider precedence
        let embeddingProviders: string[] = [];
        if (embeddingPrecedenceStr) {
            if (embeddingPrecedenceStr.includes(',')) {
                embeddingProviders = embeddingPrecedenceStr.split(',').map(p => p.trim());
            } else {
                embeddingProviders.push(embeddingPrecedenceStr.trim());
            }
        }

        // Parse AI provider precedence
        let aiProviders: string[] = [];
        if (aiPrecedenceStr) {
            if (aiPrecedenceStr.includes(',')) {
                aiProviders = aiPrecedenceStr.split(',').map(p => p.trim());
            } else {
                aiProviders.push(aiPrecedenceStr.trim());
            }
        }

        // Combine all providers (some might be in both lists)
        const allConfiguredProviders = [...new Set([...embeddingProviders, ...aiProviders])];

        // Check if default provider is in precedence list
        if (defaultProvider && !embeddingProviders.includes(defaultProvider)) {
            errors.push({
                provider: defaultProvider,
                type: 'missing_from_precedence',
                message: `Default embedding provider "${defaultProvider}" is not in your embedding provider precedence list.`
            });
        }

        // Check if each configured provider is available
        for (const providerName of allConfiguredProviders) {
            const provider = providerManager.getEmbeddingProvider(providerName);

            if (!provider) {
                let message = `Provider "${providerName}" is listed in your provider precedence, but is not available.`;

                // Add provider-specific guidance
                if (providerName === 'openai') {
                    const apiKey = await options.getOption('openaiApiKey');
                    if (!apiKey) {
                        message += ` You need to add an OpenAI API key in AI settings.`;
                        errors.push({
                            provider: providerName,
                            type: 'missing_api_key',
                            message
                        });
                        continue;
                    }
                } else if (providerName === 'ollama') {
                    const enabled = await options.getOptionBool('ollamaEnabled');
                    if (!enabled) {
                        message += ` You need to enable Ollama in AI settings.`;
                        errors.push({
                            provider: providerName,
                            type: 'not_available',
                            message
                        });
                        continue;
                    }
                } else if (providerName === 'voyage') {
                    const apiKey = await options.getOption('voyageApiKey');
                    if (!apiKey) {
                        message += ` You need to add a Voyage API key in AI settings.`;
                        errors.push({
                            provider: providerName,
                            type: 'missing_api_key',
                            message
                        });
                        continue;
                    }
                } else if (providerName === 'anthropic') {
                    const apiKey = await options.getOption('anthropicApiKey');
                    if (!apiKey) {
                        message += ` You need to add an Anthropic API key in AI settings.`;
                        errors.push({
                            provider: providerName,
                            type: 'missing_api_key',
                            message
                        });
                        continue;
                    }
                }

                // Generic error
                errors.push({
                    provider: providerName,
                    type: 'not_available',
                    message
                });
            }
        }

        return errors;
    }

    /**
     * Check if there are any validation errors
     */
    async hasValidationErrors(): Promise<boolean> {
        const errors = await this.getValidationErrors();
        return errors.length > 0;
    }
}

const validationService = new ValidationService();
export default validationService;
