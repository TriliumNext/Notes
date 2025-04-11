import type { ChatPipelineInput, ChatPipelineConfig, PipelineMetrics, StreamCallback } from './interfaces.js';
import type { ChatResponse, StreamChunk, Message } from '../ai_interface.js';
import { ContextExtractionStage } from './stages/context_extraction_stage.js';
import { SemanticContextExtractionStage } from './stages/semantic_context_extraction_stage.js';
import { AgentToolsContextStage } from './stages/agent_tools_context_stage.js';
import { MessagePreparationStage } from './stages/message_preparation_stage.js';
import { ModelSelectionStage } from './stages/model_selection_stage.js';
import { LLMCompletionStage } from './stages/llm_completion_stage.js';
import { ResponseProcessingStage } from './stages/response_processing_stage.js';
import { ToolCallingStage } from './stages/tool_calling_stage.js';
import { VectorSearchStage } from './stages/vector_search_stage.js';
import toolRegistry from '../tools/tool_registry.js';
import toolInitializer from '../tools/tool_initializer.js';
import log from '../../log.js';
import type { LLMServiceInterface } from '../interfaces/agent_tool_interfaces.js';

/**
 * Pipeline for managing the entire chat flow
 * Implements a modular, composable architecture where each stage is a separate component
 */
export class ChatPipeline {
    stages: {
        contextExtraction: ContextExtractionStage;
        semanticContextExtraction: SemanticContextExtractionStage;
        agentToolsContext: AgentToolsContextStage;
        messagePreparation: MessagePreparationStage;
        modelSelection: ModelSelectionStage;
        llmCompletion: LLMCompletionStage;
        responseProcessing: ResponseProcessingStage;
        toolCalling: ToolCallingStage;
        vectorSearch: VectorSearchStage;
    };

    config: ChatPipelineConfig;
    metrics: PipelineMetrics;

    /**
     * Create a new chat pipeline
     * @param config Optional pipeline configuration
     */
    constructor(config?: Partial<ChatPipelineConfig>) {
        // Initialize all pipeline stages
        this.stages = {
            contextExtraction: new ContextExtractionStage(),
            semanticContextExtraction: new SemanticContextExtractionStage(),
            agentToolsContext: new AgentToolsContextStage(),
            messagePreparation: new MessagePreparationStage(),
            modelSelection: new ModelSelectionStage(),
            llmCompletion: new LLMCompletionStage(),
            responseProcessing: new ResponseProcessingStage(),
            toolCalling: new ToolCallingStage(),
            vectorSearch: new VectorSearchStage()
        };

        // Set default configuration values
        this.config = {
            enableStreaming: true,
            enableMetrics: true,
            maxToolCallIterations: 5,
            ...config
        };

        // Initialize metrics
        this.metrics = {
            totalExecutions: 0,
            averageExecutionTime: 0,
            stageMetrics: {}
        };

        // Initialize stage metrics
        Object.keys(this.stages).forEach(stageName => {
            this.metrics.stageMetrics[stageName] = {
                totalExecutions: 0,
                averageExecutionTime: 0
            };
        });
    }

    /**
     * Execute the chat pipeline
     * This is the main entry point that orchestrates all pipeline stages
     */
    async execute(input: ChatPipelineInput): Promise<ChatResponse> {
        log.info(`========== STARTING CHAT PIPELINE ==========`);
        log.info(`Executing chat pipeline with ${input.messages.length} messages`);
        const startTime = Date.now();
        this.metrics.totalExecutions++;

        // Initialize streaming handler if requested
        let streamCallback = input.streamCallback;
        let accumulatedText = '';

        try {
            // Extract content length for model selection
            let contentLength = 0;
            for (const message of input.messages) {
                contentLength += message.content.length;
            }

            // Initialize tools if needed
            try {
                const toolCount = toolRegistry.getAllTools().length;

                // If there are no tools registered, initialize them
                if (toolCount === 0) {
                    log.info('No tools found in registry, initializing tools...');
                    await toolInitializer.initializeTools();
                    log.info(`Tools initialized, now have ${toolRegistry.getAllTools().length} tools`);
                } else {
                    log.info(`Found ${toolCount} tools already registered`);
                }
            } catch (error: any) {
                log.error(`Error checking/initializing tools: ${error.message || String(error)}`);
            }

            // First, select the appropriate model based on query complexity and content length
            const modelSelectionStartTime = Date.now();
            log.info(`========== MODEL SELECTION ==========`);
            const modelSelection = await this.stages.modelSelection.execute({
                options: input.options,
                query: input.query,
                contentLength
            });
            this.updateStageMetrics('modelSelection', modelSelectionStartTime);
            log.info(`Selected model: ${modelSelection.options.model || 'default'}, enableTools: ${modelSelection.options.enableTools}`);

            // Determine if we should use tools or semantic context
            const useTools = modelSelection.options.enableTools === true;
            const useEnhancedContext = input.options?.useAdvancedContext === true;

            // Early return if we don't have a query or enhanced context is disabled
            if (!input.query || !useEnhancedContext) {
                log.info(`========== SIMPLE QUERY MODE ==========`);
                log.info('Enhanced context disabled or no query provided, skipping context enrichment');

                // Prepare messages without additional context
                const messagePreparationStartTime = Date.now();
                const preparedMessages = await this.stages.messagePreparation.execute({
                    messages: input.messages,
                    systemPrompt: input.options?.systemPrompt,
                    options: modelSelection.options
                });
                this.updateStageMetrics('messagePreparation', messagePreparationStartTime);

                // Generate completion using the LLM
                const llmStartTime = Date.now();
                const completion = await this.stages.llmCompletion.execute({
                    messages: preparedMessages.messages,
                    options: modelSelection.options
                });
                this.updateStageMetrics('llmCompletion', llmStartTime);

                return completion.response;
            }

            // STAGE 1: Start with the user's query
            const userQuery = input.query || '';
            log.info(`========== STAGE 1: USER QUERY ==========`);
            log.info(`Processing query with: question="${userQuery.substring(0, 50)}...", noteId=${input.noteId}, showThinking=${input.showThinking}`);

            // STAGE 2: Perform query decomposition using the LLM
            log.info(`========== STAGE 2: QUERY DECOMPOSITION ==========`);
            log.info('Performing query decomposition to generate effective search queries');
            const llmService = await this.getLLMService();
            let searchQueries = [userQuery]; // Default to original query

            if (llmService && llmService.generateSearchQueries) {
                try {
                    const decompositionResult = await llmService.generateSearchQueries(userQuery);
                    if (decompositionResult && decompositionResult.length > 0) {
                        searchQueries = decompositionResult;
                        log.info(`Generated ${searchQueries.length} search queries: ${JSON.stringify(searchQueries)}`);
                    } else {
                        log.info('Query decomposition returned no results, using original query');
                    }
                } catch (error: any) {
                    log.error(`Error in query decomposition: ${error.message || String(error)}`);
                }
            } else {
                log.info('No LLM service available for query decomposition, using original query');
            }

            // STAGE 3: Execute vector similarity search with decomposed queries
            const vectorSearchStartTime = Date.now();
            log.info(`========== STAGE 3: VECTOR SEARCH ==========`);
            log.info('Using VectorSearchStage pipeline component to find relevant notes');

            const vectorSearchResult = await this.stages.vectorSearch.execute({
                query: userQuery,
                noteId: input.noteId || 'global',
                options: {
                    maxResults: 5, // Can be adjusted
                    useEnhancedQueries: true,
                    threshold: 0.6,
                    llmService: llmService || undefined
                }
            });

            this.updateStageMetrics('vectorSearch', vectorSearchStartTime);

            log.info(`Vector search found ${vectorSearchResult.searchResults.length} relevant notes`);

            // Extract context from search results
            log.info(`========== SEMANTIC CONTEXT EXTRACTION ==========`);
            const semanticContextStartTime = Date.now();
            const semanticContext = await this.stages.semanticContextExtraction.execute({
                noteId: input.noteId || 'global',
                query: userQuery,
                messages: input.messages,
                searchResults: vectorSearchResult.searchResults
            });

            const context = semanticContext.context;
            this.updateStageMetrics('semanticContextExtraction', semanticContextStartTime);
            log.info(`Extracted semantic context (${context.length} chars)`);

            // STAGE 4: Prepare messages with context and tool definitions for the LLM
            log.info(`========== STAGE 4: MESSAGE PREPARATION ==========`);
            const messagePreparationStartTime = Date.now();
            const preparedMessages = await this.stages.messagePreparation.execute({
                messages: input.messages,
                context,
                systemPrompt: input.options?.systemPrompt,
                options: modelSelection.options
            });
            this.updateStageMetrics('messagePreparation', messagePreparationStartTime);
            log.info(`Prepared ${preparedMessages.messages.length} messages for LLM, tools enabled: ${useTools}`);

            // Setup streaming handler if streaming is enabled and callback provided
            // Check if streaming should be enabled based on several conditions
            const streamEnabledInConfig = this.config.enableStreaming;
            const streamFormatRequested = input.format === 'stream';
            const streamRequestedInOptions = modelSelection.options.stream === true;
            const streamCallbackAvailable = typeof streamCallback === 'function';
            
            log.info(`[ChatPipeline] Request type info - Format: ${input.format || 'not specified'}, Options from pipelineInput: ${JSON.stringify({stream: input.options?.stream})}`);
            log.info(`[ChatPipeline] Stream settings - config.enableStreaming: ${streamEnabledInConfig}, format parameter: ${input.format}, modelSelection.options.stream: ${modelSelection.options.stream}, streamCallback available: ${streamCallbackAvailable}`);
            
            // IMPORTANT: Respect the existing stream option but with special handling for callbacks:
            // 1. If a stream callback is available, streaming MUST be enabled for it to work
            // 2. Otherwise, preserve the original stream setting from input options
            
            // First, determine what the stream value should be based on various factors:
            let shouldEnableStream = modelSelection.options.stream;
            
            if (streamCallbackAvailable) {
                // If we have a stream callback, we NEED to enable streaming
                // This is critical for GET requests with EventSource
                shouldEnableStream = true;
                log.info(`[ChatPipeline] Stream callback available, enabling streaming`);
            } else if (streamRequestedInOptions) {
                // Stream was explicitly requested in options, honor that setting
                log.info(`[ChatPipeline] Stream explicitly requested in options: ${streamRequestedInOptions}`);
                shouldEnableStream = streamRequestedInOptions;
            } else if (streamFormatRequested) {
                // Format=stream parameter indicates streaming was requested
                log.info(`[ChatPipeline] Stream format requested in parameters`);
                shouldEnableStream = true;
            } else {
                // No explicit streaming indicators, use config default
                log.info(`[ChatPipeline] No explicit stream settings, using config default: ${streamEnabledInConfig}`);
                shouldEnableStream = streamEnabledInConfig;
            }
            
            // Set the final stream option
            modelSelection.options.stream = shouldEnableStream;
            
            log.info(`[ChatPipeline] Final streaming decision: stream=${shouldEnableStream}, will stream to client=${streamCallbackAvailable && shouldEnableStream}`);
            

            // STAGE 5 & 6: Handle LLM completion and tool execution loop
            log.info(`========== STAGE 5: LLM COMPLETION ==========`);
            const llmStartTime = Date.now();
            const completion = await this.stages.llmCompletion.execute({
                messages: preparedMessages.messages,
                options: modelSelection.options
            });
            this.updateStageMetrics('llmCompletion', llmStartTime);
            log.info(`Received LLM response from model: ${completion.response.model}, provider: ${completion.response.provider}`);

            // Handle streaming if enabled and available 
            // Use shouldEnableStream variable which contains our streaming decision
            if (shouldEnableStream && completion.response.stream && streamCallback) {
                // Setup stream handler that passes chunks through response processing
                await completion.response.stream(async (chunk: StreamChunk) => {
                    // Process the chunk text
                    const processedChunk = await this.processStreamChunk(chunk, input.options);

                    // Accumulate text for final response
                    accumulatedText += processedChunk.text;

                    // Forward to callback with original chunk data in case it contains additional information
                    await streamCallback!(processedChunk.text, processedChunk.done, chunk);
                });
            }

            // Process any tool calls in the response
            let currentMessages = preparedMessages.messages;
            let currentResponse = completion.response;
            let toolCallIterations = 0;
            const maxToolCallIterations = this.config.maxToolCallIterations;

            // Check if tools were enabled in the options
            const toolsEnabled = modelSelection.options.enableTools !== false;

            // Log decision points for tool execution
            log.info(`========== TOOL EXECUTION DECISION ==========`);
            log.info(`Tools enabled in options: ${toolsEnabled}`);
            log.info(`Response provider: ${currentResponse.provider || 'unknown'}`);
            log.info(`Response model: ${currentResponse.model || 'unknown'}`);
            log.info(`Response has tool_calls: ${currentResponse.tool_calls ? 'true' : 'false'}`);
            if (currentResponse.tool_calls) {
                log.info(`Number of tool calls: ${currentResponse.tool_calls.length}`);
                log.info(`Tool calls details: ${JSON.stringify(currentResponse.tool_calls)}`);

                // Check if we have a response from Ollama, which might be handled differently
                if (currentResponse.provider === 'Ollama') {
                    log.info(`ATTENTION: Response is from Ollama - checking if tool execution path is correct`);
                    log.info(`Tool calls type: ${typeof currentResponse.tool_calls}`);
                    log.info(`First tool call name: ${currentResponse.tool_calls[0]?.function?.name || 'unknown'}`);
                }
            }

            // Tool execution loop
            if (toolsEnabled && currentResponse.tool_calls && currentResponse.tool_calls.length > 0) {
                log.info(`========== STAGE 6: TOOL EXECUTION ==========`);
                log.info(`Response contains ${currentResponse.tool_calls.length} tool calls, processing...`);

                // Format tool calls for logging
                log.info(`========== TOOL CALL DETAILS ==========`);
                currentResponse.tool_calls.forEach((toolCall, idx) => {
                    log.info(`Tool call ${idx + 1}: name=${toolCall.function?.name || 'unknown'}, id=${toolCall.id || 'no-id'}`);
                    log.info(`Arguments: ${toolCall.function?.arguments || '{}'}`);
                });

                // Keep track of whether we're in a streaming response
                const isStreaming = shouldEnableStream && streamCallback;
                let streamingPaused = false;

                // If streaming was enabled, send an update to the user
                if (isStreaming && streamCallback) {
                    streamingPaused = true;
                    await streamCallback('', true); // Signal pause in streaming
                    await streamCallback('\n\n[Executing tools...]\n\n', false);
                }

                while (toolCallIterations < maxToolCallIterations) {
                    toolCallIterations++;
                    log.info(`========== TOOL ITERATION ${toolCallIterations}/${maxToolCallIterations} ==========`);

                    // Create a copy of messages before tool execution
                    const previousMessages = [...currentMessages];

                    try {
                        const toolCallingStartTime = Date.now();
                        log.info(`========== PIPELINE TOOL EXECUTION FLOW ==========`);
                        log.info(`About to call toolCalling.execute with ${currentResponse.tool_calls.length} tool calls`);
                        log.info(`Tool calls being passed to stage: ${JSON.stringify(currentResponse.tool_calls)}`);

                        const toolCallingResult = await this.stages.toolCalling.execute({
                            response: currentResponse,
                            messages: currentMessages,
                            options: modelSelection.options
                        });
                        this.updateStageMetrics('toolCalling', toolCallingStartTime);

                        log.info(`ToolCalling stage execution complete, got result with needsFollowUp: ${toolCallingResult.needsFollowUp}`);

                        // Update messages with tool results
                        currentMessages = toolCallingResult.messages;

                        // Log the tool results for debugging
                        const toolResultMessages = currentMessages.filter(
                            msg => msg.role === 'tool' && !previousMessages.includes(msg)
                        );

                        log.info(`========== TOOL EXECUTION RESULTS ==========`);
                        toolResultMessages.forEach((msg, idx) => {
                            log.info(`Tool result ${idx + 1}: tool_call_id=${msg.tool_call_id}, content=${msg.content.substring(0, 50)}...`);

                            // If streaming, show tool executions to the user
                            if (isStreaming && streamCallback) {
                                // For each tool result, format a readable message for the user
                                const toolName = this.getToolNameFromToolCallId(currentMessages, msg.tool_call_id || '');
                                const formattedToolResult = `[Tool: ${toolName || 'unknown'}]\n${msg.content}\n\n`;
                                streamCallback(formattedToolResult, false);
                            }
                        });

                        // Check if we need another LLM completion for tool results
                        if (toolCallingResult.needsFollowUp) {
                            log.info(`========== TOOL FOLLOW-UP REQUIRED ==========`);
                            log.info('Tool execution complete, sending results back to LLM');

                            // Ensure messages are properly formatted
                            this.validateToolMessages(currentMessages);

                            // If streaming, show progress to the user
                            if (isStreaming && streamCallback) {
                                await streamCallback('[Generating response with tool results...]\n\n', false);
                            }

                            // Extract tool execution status information for Ollama feedback
                            let toolExecutionStatus;

                            if (currentResponse.provider === 'Ollama') {
                                // Collect tool execution status from the tool results
                                toolExecutionStatus = toolResultMessages.map(msg => {
                                    // Determine if this was a successful tool call
                                    const isError = msg.content.startsWith('Error:');
                                    return {
                                        toolCallId: msg.tool_call_id || '',
                                        name: msg.name || 'unknown',
                                        success: !isError,
                                        result: msg.content,
                                        error: isError ? msg.content.substring(7) : undefined
                                    };
                                });

                                log.info(`Created tool execution status for Ollama: ${toolExecutionStatus.length} entries`);
                                toolExecutionStatus.forEach((status, idx) => {
                                    log.info(`Tool status ${idx + 1}: ${status.name} - ${status.success ? 'success' : 'failed'}`);
                                });
                            }

                            // Generate a new completion with the updated messages
                            const followUpStartTime = Date.now();
                            const followUpCompletion = await this.stages.llmCompletion.execute({
                                messages: currentMessages,
                                options: {
                                    ...modelSelection.options,
                                    // Ensure tool support is still enabled for follow-up requests
                                    enableTools: true,
                                    // Disable streaming during tool execution follow-ups
                                    stream: false,
                                    // Add tool execution status for Ollama provider
                                    ...(currentResponse.provider === 'Ollama' ? { toolExecutionStatus } : {})
                                }
                            });
                            this.updateStageMetrics('llmCompletion', followUpStartTime);

                            // Update current response for the next iteration
                            currentResponse = followUpCompletion.response;

                            // Check if we need to continue the tool calling loop
                            if (!currentResponse.tool_calls || currentResponse.tool_calls.length === 0) {
                                log.info(`========== TOOL EXECUTION COMPLETE ==========`);
                                log.info('No more tool calls, breaking tool execution loop');
                                break;
                            } else {
                                log.info(`========== ADDITIONAL TOOL CALLS DETECTED ==========`);
                                log.info(`Next iteration has ${currentResponse.tool_calls.length} more tool calls`);
                                // Log the next set of tool calls
                                currentResponse.tool_calls.forEach((toolCall, idx) => {
                                    log.info(`Next tool call ${idx + 1}: name=${toolCall.function?.name || 'unknown'}, id=${toolCall.id || 'no-id'}`);
                                    log.info(`Arguments: ${toolCall.function?.arguments || '{}'}`);
                                });
                            }
                        } else {
                            log.info(`========== TOOL EXECUTION COMPLETE ==========`);
                            log.info('No follow-up needed, breaking tool execution loop');
                            break;
                        }
                    } catch (error: any) {
                        log.info(`========== TOOL EXECUTION ERROR ==========`);
                        log.error(`Error in tool execution: ${error.message || String(error)}`);

                        // Add error message to the conversation if tool execution fails
                        currentMessages.push({
                            role: 'system',
                            content: `Error executing tool: ${error.message || String(error)}. Please try a different approach.`
                        });

                        // If streaming, show error to the user
                        if (isStreaming && streamCallback) {
                            await streamCallback(`[Tool execution error: ${error.message || 'unknown error'}]\n\n`, false);
                        }

                        // For Ollama, create tool execution status with the error
                        let toolExecutionStatus;
                        if (currentResponse.provider === 'Ollama' && currentResponse.tool_calls) {
                            // We need to create error statuses for all tool calls that failed
                            toolExecutionStatus = currentResponse.tool_calls.map(toolCall => {
                                return {
                                    toolCallId: toolCall.id || '',
                                    name: toolCall.function?.name || 'unknown',
                                    success: false,
                                    result: `Error: ${error.message || 'unknown error'}`,
                                    error: error.message || 'unknown error'
                                };
                            });

                            log.info(`Created error tool execution status for Ollama: ${toolExecutionStatus.length} entries`);
                        }

                        // Make a follow-up request to the LLM with the error information
                        const errorFollowUpCompletion = await this.stages.llmCompletion.execute({
                            messages: currentMessages,
                            options: {
                                ...modelSelection.options,
                                // For Ollama, include tool execution status
                                ...(currentResponse.provider === 'Ollama' ? { toolExecutionStatus } : {})
                            }
                        });

                        // Update current response and break the tool loop
                        currentResponse = errorFollowUpCompletion.response;
                        break;
                    }
                }

                if (toolCallIterations >= maxToolCallIterations) {
                    log.info(`========== MAXIMUM TOOL ITERATIONS REACHED ==========`);
                    log.error(`Reached maximum tool call iterations (${maxToolCallIterations}), terminating loop`);

                    // Add a message to inform the LLM that we've reached the limit
                    currentMessages.push({
                        role: 'system',
                        content: `Maximum tool call iterations (${maxToolCallIterations}) reached. Please provide your best response with the information gathered so far.`
                    });

                    // If streaming, inform the user about iteration limit
                    if (isStreaming && streamCallback) {
                        await streamCallback(`[Reached maximum of ${maxToolCallIterations} tool calls. Finalizing response...]\n\n`, false);
                    }

                    // For Ollama, create a status about reaching max iterations
                    let toolExecutionStatus;
                    if (currentResponse.provider === 'Ollama' && currentResponse.tool_calls) {
                        // Create a special status message about max iterations
                        toolExecutionStatus = [
                            {
                                toolCallId: 'max-iterations',
                                name: 'system',
                                success: false,
                                result: `Maximum tool call iterations (${maxToolCallIterations}) reached.`,
                                error: `Reached the maximum number of allowed tool calls (${maxToolCallIterations}). Please provide a final response with the information gathered so far.`
                            }
                        ];

                        log.info(`Created max iterations status for Ollama`);
                    }

                    // Make a final request to get a summary response
                    const finalFollowUpCompletion = await this.stages.llmCompletion.execute({
                        messages: currentMessages,
                        options: {
                            ...modelSelection.options,
                            enableTools: false, // Disable tools for the final response
                            // For Ollama, include tool execution status
                            ...(currentResponse.provider === 'Ollama' ? { toolExecutionStatus } : {})
                        }
                    });

                    // Update the current response
                    currentResponse = finalFollowUpCompletion.response;
                }

                // If streaming was paused for tool execution, resume it now with the final response
                if (isStreaming && streamCallback && streamingPaused) {
                    // Resume streaming with the final response text
                    await streamCallback(currentResponse.text, true);
                }
            } else if (toolsEnabled) {
                log.info(`========== NO TOOL CALLS DETECTED ==========`);
                log.info(`LLM response did not contain any tool calls, skipping tool execution`);
            }

            // Process the final response
            log.info(`========== FINAL RESPONSE PROCESSING ==========`);
            const responseProcessingStartTime = Date.now();
            const processedResponse = await this.stages.responseProcessing.execute({
                response: currentResponse,
                options: modelSelection.options
            });
            this.updateStageMetrics('responseProcessing', responseProcessingStartTime);
            log.info(`Final response processed, returning to user (${processedResponse.text.length} chars)`);

            // Return the final response to the user
            // The ResponseProcessingStage returns {text}, not {response}
            // So we update our currentResponse with the processed text
            currentResponse.text = processedResponse.text;

            log.info(`========== PIPELINE COMPLETE ==========`);
            return currentResponse;
        } catch (error: any) {
            log.info(`========== PIPELINE ERROR ==========`);
            log.error(`Error in chat pipeline: ${error.message || String(error)}`);
            throw error;
        }
    }

    /**
     * Helper method to get an LLM service for query processing
     */
    private async getLLMService(): Promise<LLMServiceInterface | null> {
        try {
            const aiServiceManager = await import('../ai_service_manager.js').then(module => module.default);
            return aiServiceManager.getService();
        } catch (error: any) {
            log.error(`Error getting LLM service: ${error.message || String(error)}`);
            return null;
        }
    }

    /**
     * Process a stream chunk through the response processing stage
     */
    private async processStreamChunk(chunk: StreamChunk, options?: any): Promise<StreamChunk> {
        try {
            // Only process non-empty chunks
            if (!chunk.text) return chunk;

            // Create a minimal response object for the processor
            const miniResponse = {
                text: chunk.text,
                model: 'streaming',
                provider: 'streaming'
            };

            // Process the chunk text
            const processed = await this.stages.responseProcessing.execute({
                response: miniResponse,
                options: options
            });

            // Return processed chunk
            return {
                ...chunk,
                text: processed.text
            };
        } catch (error) {
            // On error, return original chunk
            log.error(`Error processing stream chunk: ${error}`);
            return chunk;
        }
    }

    /**
     * Update metrics for a pipeline stage
     */
    private updateStageMetrics(stageName: string, startTime: number) {
        if (!this.config.enableMetrics) return;

        const executionTime = Date.now() - startTime;
        const metrics = this.metrics.stageMetrics[stageName];

        metrics.totalExecutions++;
        metrics.averageExecutionTime =
            (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) /
            metrics.totalExecutions;
    }

    /**
     * Get the current pipeline metrics
     */
    getMetrics(): PipelineMetrics {
        return this.metrics;
    }

    /**
     * Reset pipeline metrics
     */
    resetMetrics(): void {
        this.metrics.totalExecutions = 0;
        this.metrics.averageExecutionTime = 0;

        Object.keys(this.metrics.stageMetrics).forEach(stageName => {
            this.metrics.stageMetrics[stageName] = {
                totalExecutions: 0,
                averageExecutionTime: 0
            };
        });
    }

    /**
     * Find tool name from tool call ID by looking at previous assistant messages
     */
    private getToolNameFromToolCallId(messages: Message[], toolCallId: string): string {
        if (!toolCallId) return 'unknown';

        // Look for assistant messages with tool_calls
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message.role === 'assistant' && message.tool_calls) {
                // Find the tool call with the matching ID
                const toolCall = message.tool_calls.find(tc => tc.id === toolCallId);
                if (toolCall && toolCall.function && toolCall.function.name) {
                    return toolCall.function.name;
                }
            }
        }

        return 'unknown';
    }

    /**
     * Validate tool messages to ensure they're properly formatted
     */
    private validateToolMessages(messages: Message[]): void {
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];

            // Ensure tool messages have required fields
            if (message.role === 'tool') {
                if (!message.tool_call_id) {
                    log.info(`Tool message missing tool_call_id, adding placeholder`);
                    message.tool_call_id = `tool_${i}`;
                }

                // Content should be a string
                if (typeof message.content !== 'string') {
                    log.info(`Tool message content is not a string, converting`);
                    try {
                        message.content = JSON.stringify(message.content);
                    } catch (e) {
                        message.content = String(message.content);
                    }
                }
            }
        }
    }
}
