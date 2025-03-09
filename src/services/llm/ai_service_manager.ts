import options from '../options.js';
import type { AIService, ChatCompletionOptions, ChatResponse, Message } from './ai_interface.js';
import { OpenAIService } from './openai_service.js';
import { AnthropicService } from './anthropic_service.js';
import { OllamaService } from './ollama_service.js';
import log from '../log.js';

type ServiceProviders = 'openai' | 'anthropic' | 'ollama';

export class AIServiceManager {
    private services: Record<ServiceProviders, AIService> = {
        openai: new OpenAIService(),
        anthropic: new AnthropicService(),
        ollama: new OllamaService()
    };

    private providerOrder: ServiceProviders[] = ['openai', 'anthropic', 'ollama']; // Default order
    private initialized = false;

    constructor() {
        // Don't call updateProviderOrder here
        // Wait until a method is called to initialize
    }

    /**
     * Update the provider precedence order from saved options
     * Returns true if successful, false if options not available yet
     */
    updateProviderOrder(): boolean {
        if (this.initialized) {
            return true;
        }

        try {
            // Default precedence: openai, anthropic, ollama
            const defaultOrder: ServiceProviders[] = ['openai', 'anthropic', 'ollama'];

            // Get custom order from options
            const customOrder = options.getOption('aiProviderPrecedence');

            if (customOrder) {
                try {
                    const parsed = JSON.parse(customOrder);
                    // Validate that all providers are valid
                    if (Array.isArray(parsed) &&
                        parsed.every(p => Object.keys(this.services).includes(p))) {
                        this.providerOrder = parsed as ServiceProviders[];
                    } else {
                        log.info('Invalid AI provider precedence format, using defaults');
                        this.providerOrder = defaultOrder;
                    }
                } catch (e) {
                    log.error(`Failed to parse AI provider precedence: ${e}`);
                    this.providerOrder = defaultOrder;
                }
            } else {
                this.providerOrder = defaultOrder;
            }

            this.initialized = true;
            return true;
        } catch (error) {
            // If options table doesn't exist yet, use defaults
            // This happens during initial database creation
            this.providerOrder = ['openai', 'anthropic', 'ollama'];
            return false;
        }
    }

    /**
     * Ensure manager is initialized before using
     */
    private ensureInitialized() {
        if (!this.initialized) {
            this.updateProviderOrder();
        }
    }

    /**
     * Check if any AI service is available
     */
    isAnyServiceAvailable(): boolean {
        return Object.values(this.services).some(service => service.isAvailable());
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): ServiceProviders[] {
        this.ensureInitialized();
        return Object.entries(this.services)
            .filter(([_, service]) => service.isAvailable())
            .map(([key, _]) => key as ServiceProviders);
    }

    /**
     * Generate a chat completion response using the first available AI service
     * based on the configured precedence order
     */
    async generateChatCompletion(messages: Message[], options: ChatCompletionOptions = {}): Promise<ChatResponse> {
        this.ensureInitialized();

        if (!messages || messages.length === 0) {
            throw new Error('No messages provided for chat completion');
        }

        // Try providers in order of preference
        const availableProviders = this.getAvailableProviders();

        if (availableProviders.length === 0) {
            throw new Error('No AI providers are available. Please check your AI settings.');
        }

        // Sort available providers by precedence
        const sortedProviders = this.providerOrder
            .filter(provider => availableProviders.includes(provider));

        // If a specific provider is requested and available, use it
        if (options.model && options.model.includes(':')) {
            const [providerName, modelName] = options.model.split(':');

            if (availableProviders.includes(providerName as ServiceProviders)) {
                try {
                    const modifiedOptions = { ...options, model: modelName };
                    return await this.services[providerName as ServiceProviders].generateChatCompletion(messages, modifiedOptions);
                } catch (error) {
                    log.error(`Error with specified provider ${providerName}: ${error}`);
                    // If the specified provider fails, continue with the fallback providers
                }
            }
        }

        // Try each provider in order until one succeeds
        let lastError: Error | null = null;

        for (const provider of sortedProviders) {
            try {
                return await this.services[provider].generateChatCompletion(messages, options);
            } catch (error) {
                log.error(`Error with provider ${provider}: ${error}`);
                lastError = error as Error;
                // Continue to the next provider
            }
        }

        // If we get here, all providers failed
        throw new Error(`All AI providers failed: ${lastError?.message || 'Unknown error'}`);
    }
}

// Don't create singleton immediately, use a lazy-loading pattern
let instance: AIServiceManager | null = null;

/**
 * Get the AIServiceManager instance (creates it if not already created)
 */
function getInstance(): AIServiceManager {
    if (!instance) {
        instance = new AIServiceManager();
    }
    return instance;
}

export default {
    getInstance,
    // Also export methods directly for convenience
    isAnyServiceAvailable(): boolean {
        return getInstance().isAnyServiceAvailable();
    },
    getAvailableProviders() {
        return getInstance().getAvailableProviders();
    },
    async generateChatCompletion(messages: Message[], options: ChatCompletionOptions = {}): Promise<ChatResponse> {
        return getInstance().generateChatCompletion(messages, options);
    }
};
