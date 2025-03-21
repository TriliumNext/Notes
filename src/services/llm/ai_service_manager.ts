import options from '../options.js';
import type { AIService, ChatCompletionOptions, ChatResponse, Message, SemanticContextService } from './ai_interface.js';
import { OpenAIService } from './providers/openai_service.js';
import { AnthropicService } from './providers/anthropic_service.js';
import { OllamaService } from './providers/ollama_service.js';
import log from '../log.js';
import { ContextExtractor } from './context/index.js';
import contextService from './context_service.js';
import indexService from './index_service.js';
import { getEmbeddingProvider, getEnabledEmbeddingProviders } from './embeddings/providers.js';
import agentTools from './agent_tools/index.js';

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
                    // Try to parse as JSON first
                    let parsed;

                    // Handle both array in JSON format and simple string format
                    if (customOrder.startsWith('[') && customOrder.endsWith(']')) {
                        parsed = JSON.parse(customOrder);
                    } else if (typeof customOrder === 'string') {
                        // If it's a string with commas, split it
                        if (customOrder.includes(',')) {
                            parsed = customOrder.split(',').map(p => p.trim());
                        } else {
                            // If it's a simple string (like "ollama"), convert to single-item array
                            parsed = [customOrder];
                        }
                    } else {
                        // Fallback to default
                        parsed = defaultOrder;
                    }

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

            // Remove the validateEmbeddingProviders call since we now do validation on the client
            // this.validateEmbeddingProviders();

            return true;
        } catch (error) {
            // If options table doesn't exist yet, use defaults
            // This happens during initial database creation
            this.providerOrder = ['openai', 'anthropic', 'ollama'];
            return false;
        }
    }

    /**
     * Validate embedding providers configuration
     * - Check if embedding default provider is in provider precedence list
     * - Check if all providers in precedence list and default provider are enabled
     *
     * @returns A warning message if there are issues, or null if everything is fine
     */
    async validateEmbeddingProviders(): Promise<string | null> {
        try {
            // Check if AI is enabled, if not, skip validation
            const aiEnabled = await options.getOptionBool('aiEnabled');
            if (!aiEnabled) {
                return null;
            }

            // Get default embedding provider
            const defaultProviderName = await options.getOption('embeddingsDefaultProvider') || 'openai';

            // Parse provider precedence list (similar to updateProviderOrder)
            let precedenceList: string[] = [];
            const precedenceOption = await options.getOption('aiProviderPrecedence');

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

            // Get enabled providers
            const enabledProviders = await getEnabledEmbeddingProviders();
            const enabledProviderNames = enabledProviders.map(p => p.name);

            // Check if default provider is in precedence list
            const defaultInPrecedence = precedenceList.includes(defaultProviderName);

            // Check if default provider is enabled
            const defaultIsEnabled = enabledProviderNames.includes(defaultProviderName);

            // Check if all providers in precedence list are enabled
            const allPrecedenceEnabled = precedenceList.every(p =>
                enabledProviderNames.includes(p) || p === 'local');

            // Return warning message if there are issues
            if (!defaultInPrecedence || !defaultIsEnabled || !allPrecedenceEnabled) {
                let message = 'There are issues with your AI provider configuration:';

                if (!defaultInPrecedence) {
                    message += `\n• The default embedding provider "${defaultProviderName}" is not in your provider precedence list.`;
                }

                if (!defaultIsEnabled) {
                    message += `\n• The default embedding provider "${defaultProviderName}" is not enabled.`;
                }

                if (!allPrecedenceEnabled) {
                    const disabledProviders = precedenceList.filter(p =>
                        !enabledProviderNames.includes(p) && p !== 'local');
                    message += `\n• The following providers in your precedence list are not enabled: ${disabledProviders.join(', ')}.`;
                }

                message += '\n\nPlease check your AI settings.';

                // Log warning to console
                log.error('AI Provider Configuration Warning: ' + message);

                return message;
            }

            return null;
        } catch (error) {
            log.error(`Error validating embedding providers: ${error}`);
            return null;
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

    setupEventListeners() {
        // Setup event listeners for AI services
    }

    /**
     * Get the context extractor service
     * @returns The context extractor instance
     */
    getContextExtractor() {
        return contextExtractor;
    }

    /**
     * Get the context service for advanced context management
     * @returns The context service instance
     */
    getContextService() {
        return contextService;
    }

    /**
     * Get the index service for managing knowledge base indexing
     * @returns The index service instance
     */
    getIndexService() {
        return indexService;
    }

    /**
     * Initialize agent tools for enhanced LLM features
     */
    async initializeAgentTools(): Promise<void> {
        try {
            await agentTools.initialize(this);
            log.info("Agent tools initialized successfully");
        } catch (error: any) {
            log.error(`Error initializing agent tools: ${error.message}`);
        }
    }

    /**
     * Get the agent tools manager
     * This provides access to all agent tools
     */
    getAgentTools() {
        return agentTools;
    }

    /**
     * Get the vector search tool for semantic similarity search
     */
    getVectorSearchTool() {
        return agentTools.getVectorSearchTool();
    }

    /**
     * Get the note navigator tool for hierarchical exploration
     */
    getNoteNavigatorTool() {
        return agentTools.getNoteNavigatorTool();
    }

    /**
     * Get the query decomposition tool for complex queries
     */
    getQueryDecompositionTool() {
        return agentTools.getQueryDecompositionTool();
    }

    /**
     * Get the contextual thinking tool for transparent reasoning
     */
    getContextualThinkingTool() {
        return agentTools.getContextualThinkingTool();
    }

    /**
     * Get whether AI features are enabled from options
     */
    getAIEnabled(): boolean {
        return options.getOptionBool('aiEnabled');
    }

    /**
     * Set up embeddings provider for AI features
     */
    async setupEmbeddingsProvider(): Promise<void> {
        try {
            if (!this.getAIEnabled()) {
                log.info('AI features are disabled');
                return;
            }

            const preferredProvider = options.getOption('embeddingsDefaultProvider') || 'openai';

            // Check if we have enabled providers
            const enabledProviders = await getEnabledEmbeddingProviders();

            if (enabledProviders.length === 0) {
                log.info('No embedding providers are enabled');
                return;
            }

            // Validate that preferred provider is enabled
            const isPreferredEnabled = enabledProviders.some(p => p.name === preferredProvider);

            if (!isPreferredEnabled) {
                log.info(`Preferred provider "${preferredProvider}" is not enabled. Using first available.`);
            }

            // Initialize embedding providers
            log.info('Embedding providers initialized successfully');
        } catch (error: any) {
            log.error(`Error setting up embedding providers: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize the AI Service
     */
    async initialize(): Promise<void> {
        try {
            log.info("Initializing AI service...");

            // Check if AI is enabled in options
            const isAIEnabled = this.getAIEnabled();

            if (!isAIEnabled) {
                log.info("AI features are disabled in options");
                return;
            }

            // Set up embeddings provider if AI is enabled
            await this.setupEmbeddingsProvider();

            // Initialize index service
            await this.getIndexService().initialize();

            // Initialize agent tools with this service manager instance
            await agentTools.initialize(this);

            this.initialized = true;
            log.info("AI service initialized successfully");
        } catch (error: any) {
            log.error(`Error initializing AI service: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get context enhanced with agent tools
     */
    async getAgentToolsContext(
        noteId: string,
        query: string,
        showThinking: boolean = false,
        relevantNotes: Array<any> = []
    ): Promise<string> {
        // Just use the context service directly
        try {
            const cs = (await import('./context/modules/context_service.js')).default;
            return cs.getAgentToolsContext(
                noteId,
                query,
                showThinking,
                relevantNotes
            );
        } catch (error) {
            log.error(`Error in AIServiceManager.getAgentToolsContext: ${error}`);
            return `Error generating enhanced context: ${error}`;
        }
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
    },
    // Add validateEmbeddingProviders method
    async validateEmbeddingProviders(): Promise<string | null> {
        return getInstance().validateEmbeddingProviders();
    },
    // Context and index related methods
    getContextExtractor() {
        return getInstance().getContextExtractor();
    },
    getContextService() {
        return getInstance().getContextService();
    },
    getIndexService() {
        return getInstance().getIndexService();
    },
    // Agent tools related methods
    async initializeAgentTools(): Promise<void> {
        const manager = getInstance();
        return manager.initializeAgentTools();
    },
    getAgentTools() {
        return getInstance().getAgentTools();
    },
    getVectorSearchTool() {
        return getInstance().getVectorSearchTool();
    },
    getNoteNavigatorTool() {
        return getInstance().getNoteNavigatorTool();
    },
    getQueryDecompositionTool() {
        return getInstance().getQueryDecompositionTool();
    },
    getContextualThinkingTool() {
        return getInstance().getContextualThinkingTool();
    },
    async getAgentToolsContext(
        noteId: string,
        query: string,
        showThinking: boolean = false,
        relevantNotes: Array<any> = []
    ): Promise<string> {
        return getInstance().getAgentToolsContext(
            noteId,
            query,
            showThinking,
            relevantNotes
        );
    }
};

// Create an instance of ContextExtractor for backward compatibility
const contextExtractor = new ContextExtractor();
