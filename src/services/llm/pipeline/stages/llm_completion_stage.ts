import { BasePipelineStage } from '../pipeline_stage.js';
import type { LLMCompletionInput } from '../interfaces.js';
import type { ChatCompletionOptions, ChatResponse } from '../../ai_interface.js';
import aiServiceManager from '../../ai_service_manager.js';
import toolRegistry from '../../tools/tool_registry.js';
import log from '../../../log.js';

/**
 * Pipeline stage for LLM completion
 */
export class LLMCompletionStage extends BasePipelineStage<LLMCompletionInput, { response: ChatResponse }> {
    constructor() {
        super('LLMCompletion');
    }

    /**
     * Generate LLM completion using the AI service
     */
    protected async process(input: LLMCompletionInput): Promise<{ response: ChatResponse }> {
        const { messages, options, provider } = input;

        // Log input options, particularly focusing on the stream option
        log.info(`[LLMCompletionStage] Input options: ${JSON.stringify({
            model: options.model,
            provider,
            stream: options.stream,
            enableTools: options.enableTools
        })}`);
        log.info(`[LLMCompletionStage] Stream option in input: ${options.stream}, type: ${typeof options.stream}`);

        // Create a deep copy of options to avoid modifying the original
        const updatedOptions: ChatCompletionOptions = JSON.parse(JSON.stringify(options));

        // IMPORTANT: Handle stream option carefully:
        // 1. If it's undefined, leave it undefined (provider will use defaults)
        // 2. If explicitly set to true/false, ensure it's a proper boolean
        if (options.stream !== undefined) {
            updatedOptions.stream = options.stream === true;
            log.info(`[LLMCompletionStage] Stream explicitly provided in options, set to: ${updatedOptions.stream}`);
        } else {
            // If undefined, leave it undefined so provider can use its default behavior
            log.info(`[LLMCompletionStage] Stream option not explicitly set, leaving as undefined`);
        }

        // If this is a direct (non-stream) call to Ollama but has the stream flag,
        // ensure we set additional metadata to maintain proper state
        if (updatedOptions.stream && !provider && updatedOptions.providerMetadata?.provider === 'ollama') {
            log.info(`[LLMCompletionStage] This is an Ollama request with stream=true, ensuring provider config is consistent`);
        }

        log.info(`[LLMCompletionStage] Copied options: ${JSON.stringify({
            model: updatedOptions.model,
            stream: updatedOptions.stream,
            enableTools: updatedOptions.enableTools
        })}`);

        // Check if tools should be enabled
        if (updatedOptions.enableTools !== false) {
            // Get all available tools from the registry
            const toolDefinitions = toolRegistry.getAllToolDefinitions();

            if (toolDefinitions.length > 0) {
                // Enable tools and add them to the options
                updatedOptions.enableTools = true;
                updatedOptions.tools = toolDefinitions;
                log.info(`Adding ${toolDefinitions.length} tools to LLM request`);
            }
        }

        // Determine which provider to use - prioritize in this order:
        // 1. Explicit provider parameter (legacy approach)
        // 2. Provider from metadata
        // 3. Auto-selection
        let selectedProvider = provider;

        // If no explicit provider is specified, check for provider metadata
        if (!selectedProvider && updatedOptions.providerMetadata?.provider) {
            selectedProvider = updatedOptions.providerMetadata.provider;
            log.info(`Using provider ${selectedProvider} from metadata for model ${updatedOptions.model}`);
        }

        log.info(`Generating LLM completion, provider: ${selectedProvider || 'auto'}, model: ${updatedOptions?.model || 'default'}`);
        log.info(`[LLMCompletionStage] Options before service call: ${JSON.stringify({
            model: updatedOptions.model,
            stream: updatedOptions.stream,
            enableTools: updatedOptions.enableTools
        })}`);

        // If provider is specified (either explicit or from metadata), use that specific provider
        if (selectedProvider && aiServiceManager.isProviderAvailable(selectedProvider)) {
            const service = aiServiceManager.getService(selectedProvider);
            log.info(`[LLMCompletionStage] Using specific service for ${selectedProvider}, stream option: ${updatedOptions.stream}`);
            const response = await service.generateChatCompletion(messages, updatedOptions);
            return { response };
        }

        // Otherwise use the service manager to select an available provider
        log.info(`[LLMCompletionStage] Using auto-selected service, stream option: ${updatedOptions.stream}`);
        const response = await aiServiceManager.generateChatCompletion(messages, updatedOptions);
        return { response };
    }
}
