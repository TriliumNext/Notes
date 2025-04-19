import options from '../options.js';
import type { AIService, ChatCompletionOptions, ChatResponse, Message } from './ai_interface.js';
import { AnthropicService } from './providers/anthropic_service.js';
import { ContextExtractor } from './context/index.js';
import agentTools from './context_extractors/index.js';
import contextService from './context/services/context_service.js';
import { getEmbeddingProvider, getEnabledEmbeddingProviders } from './providers/providers.js';
import indexService from './index_service.js';
import log from '../log.js';
import { OllamaService } from './providers/ollama_service.js';
import { OpenAIService } from './providers/openai_service.js';

// Import interfaces
import type {
  ServiceProviders,
  IAIServiceManager,
  ProviderMetadata
} from './interfaces/ai_service_interfaces.js';
import type { NoteSearchResult } from './interfaces/context_interfaces.js';

/**
 * Interface representing relevant note context
 */
interface NoteContext {
    title: string;
    content?: string;
    noteId?: string;
    summary?: string;
    score?: number;
}

export class AIServiceManager implements IAIServiceManager {
    private services: Record<ServiceProviders, AIService> = {
        openai: new OpenAIService(),
        anthropic: new AnthropicService(),
        ollama: new OllamaService()
    };

    private providerOrder: ServiceProviders[] = ['openai', 'anthropic', 'ollama']; // Default order
    private initialized = false;

    constructor() {
        // Initialize provider order immediately
        this.updateProviderOrder();

        // Initialize tools immediately
        this.initializeTools().catch(error => {
            log.error(`Error initializing LLM tools during AIServiceManager construction: ${error.message || String(error)}`);
        });
    }

    /**
     * Initialize all LLM tools in one place
     */
    private async initializeTools(): Promise<void> {
        try {
            log.info('Initializing LLM tools during AIServiceManager construction...');

            // Initialize agent tools
            await this.initializeAgentTools();
            log.info("Agent tools initialized successfully");

            // Initialize LLM tools
            const toolInitializer = await import('./tools/tool_initializer.js');
            await toolInitializer.default.initializeTools();
            log.info("LLM tools initialized successfully");
        } catch (error: unknown) {
            log.error(`Error initializing tools: ${this.handleError(error)}`);
            // Don't throw, just log the error to prevent breaking construction
        }
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

            // Check if all providers in precedence list are enabled
            const allPrecedenceEnabled = precedenceList.every(p =>
                enabledProviderNames.includes(p) || p === 'local');

            // Return warning message if there are issues
            if (!allPrecedenceEnabled) {
                let message = 'There are issues with your AI provider configuration:';

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

        log.info(`[AIServiceManager] generateChatCompletion called with options: ${JSON.stringify({
            model: options.model,
            stream: options.stream,
            enableTools: options.enableTools
        })}`);
        log.info(`[AIServiceManager] Stream option type: ${typeof options.stream}`);

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
                    log.info(`[AIServiceManager] Using provider ${providerName} from model prefix with modifiedOptions.stream: ${modifiedOptions.stream}`);
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
                log.info(`[AIServiceManager] Trying provider ${provider} with options.stream: ${options.stream}`);
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
     * Ensure agent tools are initialized (no-op as they're initialized in constructor)
     * Kept for backward compatibility with existing API
     */
    async initializeAgentTools(): Promise<void> {
        // Agent tools are already initialized in the constructor
        // This method is kept for backward compatibility
        log.info("initializeAgentTools called, but tools are already initialized in constructor");
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
        const tools = agentTools.getTools();
        return tools.vectorSearch;
    }

    /**
     * Get the note navigator tool for hierarchical exploration
     */
    getNoteNavigatorTool() {
        const tools = agentTools.getTools();
        return tools.noteNavigator;
    }

    /**
     * Get the query decomposition tool for complex queries
     */
    getQueryDecompositionTool() {
        const tools = agentTools.getTools();
        return tools.queryDecomposition;
    }

    /**
     * Get the contextual thinking tool for transparent reasoning
     */
    getContextualThinkingTool() {
        const tools = agentTools.getTools();
        return tools.contextualThinking;
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

            // Get provider precedence list
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

            // Check if we have enabled providers
            const enabledProviders = await getEnabledEmbeddingProviders();

            if (enabledProviders.length === 0) {
                log.info('No embedding providers are enabled');
                return;
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

            // Tools are already initialized in the constructor
            // No need to initialize them again

            this.initialized = true;
            log.info("AI service initialized successfully");
        } catch (error: any) {
            log.error(`Error initializing AI service: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get description of available agent tools
     */
    async getAgentToolsDescription(): Promise<string> {
        try {
            // Get all available tools
            const tools = agentTools.getAllTools();

            if (!tools || tools.length === 0) {
                return "";
            }

            // Format tool descriptions
            const toolDescriptions = tools.map(tool =>
                `- ${tool.name}: ${tool.description}`
            ).join('\n');

            return `Available tools:\n${toolDescriptions}`;
        } catch (error) {
            log.error(`Error getting agent tools description: ${error}`);
            return "";
        }
    }

    /**
     * Get enhanced context with available agent tools
     * @param noteId - The ID of the note
     * @param query - The user's query
     * @param showThinking - Whether to show LLM's thinking process
     * @param relevantNotes - Optional notes already found to be relevant
     * @returns Enhanced context with agent tools information
     */
    async getAgentToolsContext(
        noteId: string,
        query: string,
        showThinking: boolean = false,
        relevantNotes: NoteSearchResult[] = []
    ): Promise<string> {
        try {
            // Create agent tools message
            const toolsMessage = await this.getAgentToolsDescription();

            // Agent tools are already initialized in the constructor
            // No need to initialize them again

            // If we have notes that were already found to be relevant, use them directly
            let contextNotes = relevantNotes;

            // If no notes provided, find relevant ones
            if (!contextNotes || contextNotes.length === 0) {
                try {
                    // Get the default LLM service for context enhancement
                    const provider = this.getPreferredProvider();
                    const llmService = this.getService(provider);

                    // Find relevant notes
                    contextNotes = await contextService.findRelevantNotes(
                        query,
                        noteId,
                        {
                            maxResults: 5,
                            summarize: true,
                            llmService
                        }
                    );

                    log.info(`Found ${contextNotes.length} relevant notes for context`);
                } catch (error) {
                    log.error(`Failed to find relevant notes: ${this.handleError(error)}`);
                    // Continue without context notes
                    contextNotes = [];
                }
            }

            // Format notes into context string if we have any
            let contextStr = "";
            if (contextNotes && contextNotes.length > 0) {
                contextStr = "\n\nRelevant context:\n";
                contextNotes.forEach((note, index) => {
                    contextStr += `[${index + 1}] "${note.title}"\n${note.content || 'No content available'}\n\n`;
                });
            }

            // Combine tool message with context
            return toolsMessage + contextStr;
        } catch (error) {
            log.error(`Error getting agent tools context: ${this.handleError(error)}`);
            return "";
        }
    }

    /**
     * Get AI service for the given provider
     */
    getService(provider?: string): AIService {
        this.ensureInitialized();

        // If provider is specified, try to use it
        if (provider && this.services[provider as ServiceProviders]?.isAvailable()) {
            return this.services[provider as ServiceProviders];
        }

        // Otherwise, use the first available provider in the configured order
        for (const providerName of this.providerOrder) {
            const service = this.services[providerName];
            if (service.isAvailable()) {
                return service;
            }
        }

        // If no provider is available, use first one anyway (it will throw an error)
        // This allows us to show a proper error message rather than "provider not found"
        return this.services[this.providerOrder[0]];
    }

    /**
     * Get the preferred provider based on configuration
     */
    getPreferredProvider(): string {
        this.ensureInitialized();

        // Return the first available provider in the order
        for (const providerName of this.providerOrder) {
            if (this.services[providerName].isAvailable()) {
                return providerName;
            }
        }

        // Return the first provider as fallback
        return this.providerOrder[0];
    }

    /**
     * Check if a specific provider is available
     */
    isProviderAvailable(provider: string): boolean {
        return this.services[provider as ServiceProviders]?.isAvailable() ?? false;
    }

    /**
     * Get metadata about a provider
     */
    getProviderMetadata(provider: string): ProviderMetadata | null {
        const service = this.services[provider as ServiceProviders];
        if (!service) {
            return null;
        }

        return {
            name: provider,
            capabilities: {
                chat: true,
                embeddings: provider !== 'anthropic', // Anthropic doesn't have embeddings
                streaming: true,
                functionCalling: provider === 'openai' // Only OpenAI has function calling
            },
            models: ['default'], // Placeholder, could be populated from the service
            defaultModel: 'default'
        };
    }

    /**
     * Error handler that properly types the error object
     */
    private handleError(error: unknown): string {
        if (error instanceof Error) {
            return error.message || String(error);
        }
        return String(error);
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
    // Tools are now initialized in the constructor
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
        relevantNotes: NoteSearchResult[] = []
    ): Promise<string> {
        return getInstance().getAgentToolsContext(
            noteId,
            query,
            showThinking,
            relevantNotes
        );
    },
    // New methods
    getService(provider?: string): AIService {
        return getInstance().getService(provider);
    },
    getPreferredProvider(): string {
        return getInstance().getPreferredProvider();
    },
    isProviderAvailable(provider: string): boolean {
        return getInstance().isProviderAvailable(provider);
    },
    getProviderMetadata(provider: string): ProviderMetadata | null {
        return getInstance().getProviderMetadata(provider);
    }
};

// Create an instance of ContextExtractor for backward compatibility
const contextExtractor = new ContextExtractor();
