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

    private currentChatProvider: ServiceProviders | null = null; // No default
    private currentChatService: AIService | null = null; // Current active service
    private currentEmbeddingProvider: string | null = null; // No default
    private initialized = false;

    constructor() {
        // Initialize provider immediately
        this.updateCurrentProvider();

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
     * Update the current provider from saved options
     * Returns true if successful, false if options not available yet
     */
    updateCurrentProvider(): boolean {
        if (this.initialized) {
            return true;
        }

        try {
            // Always get selected chat provider from options
            const selectedChatProvider = options.getOption('aiChatProvider');
            if (!selectedChatProvider) {
                throw new Error('No chat provider configured. Please set aiChatProvider option.');
            }
            
            if (!Object.keys(this.services).includes(selectedChatProvider)) {
                throw new Error(`Invalid chat provider '${selectedChatProvider}'. Valid providers are: ${Object.keys(this.services).join(', ')}`);
            }
            
            this.currentChatProvider = selectedChatProvider as ServiceProviders;
            this.currentChatService = this.services[this.currentChatProvider];
            
            // Always get selected embedding provider from options
            const selectedEmbeddingProvider = options.getOption('aiEmbeddingProvider');
            if (!selectedEmbeddingProvider) {
                throw new Error('No embedding provider configured. Please set aiEmbeddingProvider option.');
            }
            
            this.currentEmbeddingProvider = selectedEmbeddingProvider;

            this.initialized = true;
            log.info(`AI Service Manager initialized with chat provider: ${this.currentChatProvider}, embedding provider: ${this.currentEmbeddingProvider}`);

            return true;
        } catch (error) {
            // If options table doesn't exist yet or providers not configured
            // This happens during initial database creation
            log.error(`Failed to initialize AI providers: ${error}`);
            this.currentChatProvider = null;
            this.currentChatService = null;
            this.currentEmbeddingProvider = null;
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

            // Get selected provider from options
            const selectedProvider = await options.getOption('aiChatProvider');
            if (!selectedProvider) {
                throw new Error('No chat provider configured');
            }
            
            // Check for configuration issues with the selected provider
            const configIssues: string[] = [];
            
            // Check the selected provider for proper configuration
            if (selectedProvider === 'openai') {
                // Check OpenAI configuration
                const apiKey = await options.getOption('openaiApiKey');
                if (!apiKey) {
                    configIssues.push(`OpenAI API key is missing`);
                }
            } else if (selectedProvider === 'anthropic') {
                // Check Anthropic configuration
                const apiKey = await options.getOption('anthropicApiKey');
                if (!apiKey) {
                    configIssues.push(`Anthropic API key is missing`);
                }
            } else if (selectedProvider === 'ollama') {
                // Check Ollama configuration
                const baseUrl = await options.getOption('ollamaBaseUrl');
                if (!baseUrl) {
                    configIssues.push(`Ollama Base URL is missing`);
                }
            }
            
            // Return warning message if there are configuration issues
            if (configIssues.length > 0) {
                let message = 'There are issues with your AI provider configuration:';
                
                for (const issue of configIssues) {
                    message += `\n• ${issue}`;
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
            this.updateCurrentProvider();
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
     * Generate a chat completion response using the current AI service
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

        // If a specific provider is requested via model prefix, use it temporarily
        if (options.model && options.model.includes(':')) {
            const [providerName, modelName] = options.model.split(':');

            if (this.services[providerName as ServiceProviders]?.isAvailable()) {
                try {
                    const modifiedOptions = { ...options, model: modelName };
                    log.info(`[AIServiceManager] Using provider ${providerName} from model prefix with modifiedOptions.stream: ${modifiedOptions.stream}`);
                    return await this.services[providerName as ServiceProviders].generateChatCompletion(messages, modifiedOptions);
                } catch (error) {
                    log.error(`Error with specified provider ${providerName}: ${error}`);
                    throw new Error(`Provider ${providerName} failed: ${error}`);
                }
            } else {
                throw new Error(`Requested provider ${providerName} is not available`);
            }
        }

        // Ensure we have a configured service
        if (!this.currentChatProvider || !this.currentChatService) {
            // Try to initialize again in case options were updated
            this.initialized = false;
            this.updateCurrentProvider();
            
            if (!this.currentChatProvider || !this.currentChatService) {
                throw new Error('No chat provider configured. Please configure aiChatProvider in AI settings.');
            }
        }
        
        if (!this.currentChatService.isAvailable()) {
            throw new Error(`Configured chat provider '${this.currentChatProvider}' is not available. Please check your AI settings.`);
        }

        try {
            log.info(`[AIServiceManager] Using current chat service (${this.currentChatProvider}) with options.stream: ${options.stream}`);
            return await this.currentChatService.generateChatCompletion(messages, options);
        } catch (error) {
            log.error(`Error with provider ${this.currentChatProvider}: ${error}`);
            throw new Error(`Chat provider ${this.currentChatProvider} failed: ${error}`);
        }
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

            // Get selected embedding provider
            const selectedProvider = await options.getOption('aiEmbeddingProvider') || 'openai';

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

        // Otherwise, use the current chat service
        if (this.currentChatService && this.currentChatService.isAvailable()) {
            return this.currentChatService;
        }

        // If current service is not available, throw an error
        throw new Error(`Configured chat provider '${this.currentChatProvider}' is not available`);
    }

    /**
     * Get the preferred provider based on configuration
     */
    getPreferredProvider(): string {
        this.ensureInitialized();
        if (!this.currentChatProvider) {
            throw new Error('No chat provider configured');
        }
        return this.currentChatProvider;
    }
    
    /**
     * Get the current chat service
     */
    getCurrentChatService(): AIService | null {
        this.ensureInitialized();
        return this.currentChatService;
    }
    
    /**
     * Get the current chat provider name
     */
    getCurrentChatProvider(): string {
        this.ensureInitialized();
        if (!this.currentChatProvider) {
            throw new Error('No chat provider configured');
        }
        return this.currentChatProvider;
    }
    
    /**
     * Get the current embedding provider name
     */
    getCurrentEmbeddingProvider(): string {
        this.ensureInitialized();
        if (!this.currentEmbeddingProvider) {
            throw new Error('No embedding provider configured');
        }
        return this.currentEmbeddingProvider;
    }

    /**
     * Check if a specific provider is available
     */
    isProviderAvailable(provider: string): boolean {
        return this.services[provider as ServiceProviders]?.isAvailable() ?? false;
    }

    /**
     * Reinitialize the service manager when provider settings change
     * This will update the current provider selection and service objects
     */
    async reinitialize(): Promise<void> {
        log.info('Reinitializing AI Service Manager due to provider change');
        
        // Reset initialization flag to force update
        this.initialized = false;
        
        // Update current provider and service objects from options
        this.updateCurrentProvider();
        
        // Re-validate providers if needed
        await this.validateEmbeddingProviders();
        
        log.info(`AI Service Manager reinitialized with chat provider: ${this.currentChatProvider}, embedding provider: ${this.currentEmbeddingProvider}`);
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
    },
    async reinitialize(): Promise<void> {
        return getInstance().reinitialize();
    },
    getCurrentChatService(): AIService | null {
        return getInstance().getCurrentChatService();
    },
    getCurrentChatProvider(): string {
        return getInstance().getCurrentChatProvider();
    },
    getCurrentEmbeddingProvider(): string {
        return getInstance().getCurrentEmbeddingProvider();
    }
};

// Create an instance of ContextExtractor for backward compatibility
const contextExtractor = new ContextExtractor();
