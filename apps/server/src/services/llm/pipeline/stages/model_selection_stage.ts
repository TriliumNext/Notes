import { BasePipelineStage } from '../pipeline_stage.js';
import type { ModelSelectionInput } from '../interfaces.js';
import type { ChatCompletionOptions } from '../../ai_interface.js';
import type { ModelMetadata } from '../../providers/provider_options.js';
import log from '../../../log.js';
import options from '../../../options.js';
import aiServiceManager from '../../ai_service_manager.js';
import { SEARCH_CONSTANTS, MODEL_CAPABILITIES } from "../../constants/search_constants.js";
/**
 * Pipeline stage for selecting the appropriate LLM model
 */
export class ModelSelectionStage extends BasePipelineStage<ModelSelectionInput, { options: ChatCompletionOptions }> {
    constructor() {
        super('ModelSelection');
    }
    /**
     * Select the appropriate model based on input complexity
     */
    protected async process(input: ModelSelectionInput): Promise<{ options: ChatCompletionOptions }> {
        const { options: inputOptions, query, contentLength } = input;

        // Log input options
        log.info(`[ModelSelectionStage] Input options: ${JSON.stringify({
            model: inputOptions?.model,
            stream: inputOptions?.stream,
            enableTools: inputOptions?.enableTools
        })}`);
        log.info(`[ModelSelectionStage] Stream option in input: ${inputOptions?.stream}, type: ${typeof inputOptions?.stream}`);

        // Start with provided options or create a new object
        const updatedOptions: ChatCompletionOptions = { ...(inputOptions || {}) };

        // Preserve the stream option exactly as it was provided, including undefined state
        // This is critical for ensuring the stream option propagates correctly down the pipeline
        log.info(`[ModelSelectionStage] After copy, stream: ${updatedOptions.stream}, type: ${typeof updatedOptions.stream}`);

        // If model already specified, don't override it
        if (updatedOptions.model) {
            // Check if the model has a provider prefix, which indicates legacy format
            const modelParts = this.parseModelIdentifier(updatedOptions.model);

            if (modelParts.provider) {
                // Add provider metadata for backward compatibility
                this.addProviderMetadata(updatedOptions, modelParts.provider, modelParts.model);
                // Update the model to be just the model name without provider prefix
                updatedOptions.model = modelParts.model;
                log.info(`Using explicitly specified model: ${modelParts.model} from provider: ${modelParts.provider}`);
            } else {
                log.info(`Using explicitly specified model: ${updatedOptions.model}`);
            }

            log.info(`[ModelSelectionStage] Returning early with stream: ${updatedOptions.stream}`);
            return { options: updatedOptions };
        }

        // Enable tools by default unless explicitly disabled
        updatedOptions.enableTools = updatedOptions.enableTools !== false;

        // Add tools if not already provided
        if (updatedOptions.enableTools && (!updatedOptions.tools || updatedOptions.tools.length === 0)) {
            try {
                // Import tool registry and fetch tool definitions
                const toolRegistry = (await import('../../tools/tool_registry.js')).default;
                const toolDefinitions = toolRegistry.getAllToolDefinitions();

                if (toolDefinitions.length > 0) {
                    updatedOptions.tools = toolDefinitions;
                    log.info(`Added ${toolDefinitions.length} tools to options`);
                } else {
                    // Try to initialize tools
                    log.info('No tools found in registry, trying to initialize them');
                    try {
                        // Tools are already initialized in the AIServiceManager constructor
                        // No need to initialize them again

                        // Try again after initialization
                        const reinitToolDefinitions = toolRegistry.getAllToolDefinitions();
                        updatedOptions.tools = reinitToolDefinitions;
                        log.info(`After initialization, added ${reinitToolDefinitions.length} tools to options`);
                    } catch (initError: any) {
                        log.error(`Failed to initialize tools: ${initError.message}`);
                    }
                }
            } catch (error: any) {
                log.error(`Error loading tools: ${error.message}`);
            }
        }

        // Get default provider and model based on precedence
        let defaultProvider = 'openai';
        let defaultModelName = 'gpt-3.5-turbo';

        try {
            // Get provider precedence list
            const providerPrecedence = await options.getOption('aiProviderPrecedence');
            if (providerPrecedence) {
                // Parse provider precedence list
                let providers = [];
                if (providerPrecedence.includes(',')) {
                    providers = providerPrecedence.split(',').map(p => p.trim());
                } else if (providerPrecedence.startsWith('[') && providerPrecedence.endsWith(']')) {
                    providers = JSON.parse(providerPrecedence);
                } else {
                    providers = [providerPrecedence];
                }

                // Check for first available provider
                if (providers.length > 0) {
                    const firstProvider = providers[0];
                    defaultProvider = firstProvider;

                    // Get provider-specific default model
                    if (firstProvider === 'openai') {
                        const model = await options.getOption('openaiDefaultModel');
                        if (model) defaultModelName = model;
                    } else if (firstProvider === 'anthropic') {
                        const model = await options.getOption('anthropicDefaultModel');
                        if (model) defaultModelName = model;
                    } else if (firstProvider === 'ollama') {
                        const model = await options.getOption('ollamaDefaultModel');
                        if (model) {
                            defaultModelName = model;

                            // Enable tools for all Ollama models
                            // The Ollama API will handle models that don't support tool calling
                            log.info(`Using Ollama model ${model} with tool calling enabled`);
                            updatedOptions.enableTools = true;
                        }
                    }
                }
            }
        } catch (error) {
            // If any error occurs, use the fallback default
            log.error(`Error determining default model: ${error}`);
        }

        // Determine query complexity
        let queryComplexity = 'low';
        if (query) {
            // Simple heuristic: longer queries or those with complex terms indicate higher complexity
            const complexityIndicators = [
                'explain', 'analyze', 'compare', 'evaluate', 'synthesize',
                'summarize', 'elaborate', 'investigate', 'research', 'debate'
            ];

            const hasComplexTerms = complexityIndicators.some(term => query.toLowerCase().includes(term));
            const isLongQuery = query.length > 100;
            const hasMultipleQuestions = (query.match(/\?/g) || []).length > 1;

            if ((hasComplexTerms && isLongQuery) || hasMultipleQuestions) {
                queryComplexity = 'high';
            } else if (hasComplexTerms || isLongQuery) {
                queryComplexity = 'medium';
            }
        }

        // Check content length if provided
        if (contentLength && contentLength > SEARCH_CONSTANTS.CONTEXT.CONTENT_LENGTH.MEDIUM_THRESHOLD) {
            // For large content, favor more powerful models
            queryComplexity = contentLength > SEARCH_CONSTANTS.CONTEXT.CONTENT_LENGTH.HIGH_THRESHOLD ? 'high' : 'medium';
        }

        // Set the model and add provider metadata
        updatedOptions.model = defaultModelName;
        this.addProviderMetadata(updatedOptions, defaultProvider, defaultModelName);

        log.info(`Selected model: ${defaultModelName} from provider: ${defaultProvider} for query complexity: ${queryComplexity}`);
        log.info(`[ModelSelectionStage] Final options: ${JSON.stringify({
            model: updatedOptions.model,
            stream: updatedOptions.stream,
            provider: defaultProvider,
            enableTools: updatedOptions.enableTools
        })}`);

        return { options: updatedOptions };
    }

    /**
     * Helper to parse model identifier with provider prefix
     * Handles legacy format "provider:model"
     */
    private parseModelIdentifier(modelId: string): { provider?: string, model: string } {
        if (!modelId) return { model: '' };

        const parts = modelId.split(':');
        if (parts.length === 1) {
            // No provider prefix
            return { model: modelId };
        } else {
            // Extract provider and model
            const provider = parts[0];
            const model = parts.slice(1).join(':'); // Handle model names that might include :
            return { provider, model };
        }
    }

    /**
     * Add provider metadata to the options based on model name
     */
    private addProviderMetadata(options: ChatCompletionOptions, provider: string, modelName: string): void {
        // Check if we already have providerMetadata
        if (options.providerMetadata) {
            // If providerMetadata exists but not modelId, add the model name
            if (!options.providerMetadata.modelId && modelName) {
                options.providerMetadata.modelId = modelName;
            }
            return;
        }

        // If no provider could be determined, try to use precedence
        let selectedProvider = provider;
        if (!selectedProvider) {
            // List of providers in precedence order
            const providerPrecedence = ['anthropic', 'openai', 'ollama'];

            // Find the first available provider
            for (const p of providerPrecedence) {
                if (aiServiceManager.isProviderAvailable(p)) {
                    selectedProvider = p;
                    break;
                }
            }
        }

        // Set the provider metadata in the options
        if (selectedProvider) {
            // Ensure the provider is one of the valid types
            const validProvider = selectedProvider as 'openai' | 'anthropic' | 'ollama' | 'local';

            options.providerMetadata = {
                provider: validProvider,
                modelId: modelName
            };

            // For backward compatibility, ensure model name is set without prefix
            if (options.model && options.model.includes(':')) {
                options.model = modelName || options.model.split(':')[1];
            }

            log.info(`Set provider metadata: provider=${selectedProvider}, model=${modelName}`);
        }
    }

    /**
     * Determine model based on provider precedence
     */
    private determineDefaultModel(input: ModelSelectionInput): string {
        const providerPrecedence = ['anthropic', 'openai', 'ollama'];

        // Use only providers that are available
        const availableProviders = providerPrecedence.filter(provider =>
            aiServiceManager.isProviderAvailable(provider));

        if (availableProviders.length === 0) {
            throw new Error('No AI providers are available');
        }

        // Get the first available provider and its default model
        const defaultProvider = availableProviders[0] as 'openai' | 'anthropic' | 'ollama' | 'local';
        let defaultModel = 'gpt-3.5-turbo'; // Use model from our constants

        // Set provider metadata
        if (!input.options.providerMetadata) {
            input.options.providerMetadata = {
                provider: defaultProvider,
                modelId: defaultModel
            };
        }

        log.info(`Selected default model ${defaultModel} from provider ${defaultProvider}`);
        return defaultModel;
    }

    /**
     * Get estimated context window for Ollama models
     */
    private getOllamaContextWindow(model: string): number {
        // Try to find exact matches in MODEL_CAPABILITIES
        if (model in MODEL_CAPABILITIES) {
            return MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES].contextWindowTokens;
        }

        // Estimate based on model family
        if (model.includes('llama3')) {
            return MODEL_CAPABILITIES['gpt-4'].contextWindowTokens;
        } else if (model.includes('llama2')) {
            return MODEL_CAPABILITIES['default'].contextWindowTokens;
        } else if (model.includes('mistral') || model.includes('mixtral')) {
            return MODEL_CAPABILITIES['gpt-4'].contextWindowTokens;
        } else if (model.includes('gemma')) {
            return MODEL_CAPABILITIES['gpt-4'].contextWindowTokens;
        } else {
            return MODEL_CAPABILITIES['default'].contextWindowTokens;
        }
    }
}
