import type { ChatResponse, Message } from '../../ai_interface.js';
import log from '../../../log.js';
import type { StreamCallback, ToolExecutionInput } from '../interfaces.js';
import { BasePipelineStage } from '../pipeline_stage.js';
import toolRegistry from '../../tools/tool_registry.js';

/**
 * Pipeline stage for handling LLM tool calling
 * This stage is responsible for:
 * 1. Detecting tool calls in LLM responses
 * 2. Executing the appropriate tools
 * 3. Adding tool results back to the conversation
 * 4. Determining if we need to make another call to the LLM
 */
export class ToolCallingStage extends BasePipelineStage<ToolExecutionInput, { response: ChatResponse, needsFollowUp: boolean, messages: Message[] }> {
    constructor() {
        super('ToolCalling');
    }

    /**
     * Process the LLM response and execute any tool calls
     */
    protected async process(input: ToolExecutionInput): Promise<{ response: ChatResponse, needsFollowUp: boolean, messages: Message[] }> {
        const { response, messages } = input;
        const streamCallback = input.streamCallback as StreamCallback;

        log.info(`========== TOOL CALLING STAGE ENTRY ==========`);
        log.info(`Response provider: ${response.provider}, model: ${response.model || 'unknown'}`);

        log.info(`LLM requested ${response.tool_calls?.length || 0} tool calls from provider: ${response.provider}`);

        // Check if the response has tool calls
        if (!response.tool_calls || response.tool_calls.length === 0) {
            // No tool calls, return original response and messages
            log.info(`No tool calls detected in response from provider: ${response.provider}`);
            log.info(`===== EXITING TOOL CALLING STAGE: No tool_calls =====`);
            return { response, needsFollowUp: false, messages };
        }

        // Log response details for debugging
        if (response.text) {
            log.info(`Response text: "${response.text.substring(0, 200)}${response.text.length > 200 ? '...' : ''}"`);
        }

        // Check if the registry has any tools
        const availableTools = toolRegistry.getAllTools();
        log.info(`Available tools in registry: ${availableTools.length}`);

        // Log available tools for debugging
        if (availableTools.length > 0) {
            const availableToolNames = availableTools.map(t => t.definition.function.name).join(', ');
            log.info(`Available tools: ${availableToolNames}`);
        }

        if (availableTools.length === 0) {
            log.error(`No tools available in registry, cannot execute tool calls`);
            // Try to initialize tools as a recovery step
            try {
                log.info('Attempting to initialize tools as recovery step');
                const toolInitializer = await import('../../tools/tool_initializer.js');
                await toolInitializer.default.initializeTools();
                log.info(`After recovery initialization: ${toolRegistry.getAllTools().length} tools available`);
            } catch (error: any) {
                log.error(`Failed to initialize tools in recovery step: ${error.message}`);
            }
        }

        // Create a copy of messages to add the assistant message with tool calls
        const updatedMessages = [...messages];

        // Add the assistant message with the tool calls
        updatedMessages.push({
            role: 'assistant',
            content: response.text || "",
            tool_calls: response.tool_calls
        });

        // Execute each tool call and add results to messages
        log.info(`========== STARTING TOOL EXECUTION ==========`);
        log.info(`Executing ${response.tool_calls?.length || 0} tool calls in parallel`);

        const executionStartTime = Date.now();
        const toolResults = await Promise.all((response.tool_calls || []).map(async (toolCall, index) => {
            try {
                log.info(`========== TOOL CALL ${index + 1} OF ${response.tool_calls?.length || 0} ==========`);
                log.info(`Tool call ${index + 1} received - Name: ${toolCall.function.name}, ID: ${toolCall.id || 'unknown'}`);

                // Log parameters
                const argsStr = typeof toolCall.function.arguments === 'string'
                    ? toolCall.function.arguments
                    : JSON.stringify(toolCall.function.arguments);
                log.info(`Tool parameters: ${argsStr}`);

                // Get the tool from registry
                const tool = toolRegistry.getTool(toolCall.function.name);

                if (!tool) {
                    log.error(`Tool not found in registry: ${toolCall.function.name}`);
                    log.info(`Available tools: ${availableTools.map(t => t.definition.function.name).join(', ')}`);
                    throw new Error(`Tool not found: ${toolCall.function.name}`);
                }

                log.info(`Tool found in registry: ${toolCall.function.name}`);

                // Parse arguments (handle both string and object formats)
                let args;
                // At this stage, arguments should already be processed by the provider-specific service
                // But we still need to handle different formats just in case
                if (typeof toolCall.function.arguments === 'string') {
                    log.info(`Received string arguments in tool calling stage: ${toolCall.function.arguments.substring(0, 50)}...`);

                    try {
                        // Try to parse as JSON first
                        args = JSON.parse(toolCall.function.arguments);
                        log.info(`Parsed JSON arguments: ${Object.keys(args).join(', ')}`);
                    } catch (e: unknown) {
                        // If it's not valid JSON, try to check if it's a stringified object with quotes
                        const errorMessage = e instanceof Error ? e.message : String(e);
                        log.info(`Failed to parse arguments as JSON, trying alternative parsing: ${errorMessage}`);

                        // Sometimes LLMs return stringified JSON with escaped quotes or incorrect quotes
                        // Try to clean it up
                        try {
                            const cleaned = toolCall.function.arguments
                                .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
                                .replace(/\\"/g, '"')        // Replace escaped quotes
                                .replace(/([{,])\s*'([^']+)'\s*:/g, '$1"$2":') // Replace single quotes around property names
                                .replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":');    // Add quotes around unquoted property names

                            log.info(`Cleaned argument string: ${cleaned}`);
                            args = JSON.parse(cleaned);
                            log.info(`Successfully parsed cleaned arguments: ${Object.keys(args).join(', ')}`);
                        } catch (cleanError: unknown) {
                            // If all parsing fails, treat it as a text argument
                            const cleanErrorMessage = cleanError instanceof Error ? cleanError.message : String(cleanError);
                            log.info(`Failed to parse cleaned arguments: ${cleanErrorMessage}`);
                            args = { text: toolCall.function.arguments };
                            log.info(`Using text argument: ${args.text.substring(0, 50)}...`);
                        }
                    }
                } else {
                    // Arguments are already an object
                    args = toolCall.function.arguments;
                    log.info(`Using object arguments with keys: ${Object.keys(args).join(', ')}`);
                }

                // Execute the tool
                log.info(`================ EXECUTING TOOL: ${toolCall.function.name} ================`);
                log.info(`Tool parameters: ${Object.keys(args).join(', ')}`);
                log.info(`Parameters values: ${Object.entries(args).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ')}`);

                // Emit tool start event if streaming is enabled
                if (streamCallback) {
                    const toolExecutionData = {
                        action: 'start',
                        tool: toolCall.function.name,
                        args: args
                    };
                    
                    // Don't wait for this to complete, but log any errors
                    const callbackResult = streamCallback('', false, { toolExecution: toolExecutionData });
                    if (callbackResult instanceof Promise) {
                        callbackResult.catch((e: Error) => log.error(`Error sending tool execution start event: ${e.message}`));
                    }
                }

                const executionStart = Date.now();
                let result;
                try {
                    log.info(`Starting tool execution for ${toolCall.function.name}...`);
                    result = await tool.execute(args);
                    const executionTime = Date.now() - executionStart;
                    log.info(`================ TOOL EXECUTION COMPLETED in ${executionTime}ms ================`);
                    
                    // Emit tool completion event if streaming is enabled
                    if (streamCallback) {
                        const toolExecutionData = {
                            action: 'complete',
                            tool: toolCall.function.name,
                            result: result
                        };
                        
                        // Don't wait for this to complete, but log any errors
                        const callbackResult = streamCallback('', false, { toolExecution: toolExecutionData });
                        if (callbackResult instanceof Promise) {
                            callbackResult.catch((e: Error) => log.error(`Error sending tool execution complete event: ${e.message}`));
                        }
                    }
                } catch (execError: any) {
                    const executionTime = Date.now() - executionStart;
                    log.error(`================ TOOL EXECUTION FAILED in ${executionTime}ms: ${execError.message} ================`);
                    
                    // Emit tool error event if streaming is enabled
                    if (streamCallback) {
                        const toolExecutionData = {
                            action: 'error',
                            tool: toolCall.function.name,
                            error: execError.message || String(execError)
                        };
                        
                        // Don't wait for this to complete, but log any errors
                        const callbackResult = streamCallback('', false, { toolExecution: toolExecutionData });
                        if (callbackResult instanceof Promise) {
                            callbackResult.catch((e: Error) => log.error(`Error sending tool execution error event: ${e.message}`));
                        }
                    }
                    
                    throw execError;
                }

                // Log execution result
                const resultSummary = typeof result === 'string'
                    ? `${result.substring(0, 100)}...`
                    : `Object with keys: ${Object.keys(result).join(', ')}`;
                const executionTime = Date.now() - executionStart;
                log.info(`Tool execution completed in ${executionTime}ms - Result: ${resultSummary}`);

                // Return result with tool call ID
                return {
                    toolCallId: toolCall.id,
                    name: toolCall.function.name,
                    result
                };
            } catch (error: any) {
                log.error(`Error executing tool ${toolCall.function.name}: ${error.message || String(error)}`);

                // Emit tool error event if not already handled in the try/catch above
                // and if streaming is enabled
                if (streamCallback && error.name !== "ExecutionError") {
                    const toolExecutionData = {
                        action: 'error',
                        tool: toolCall.function.name,
                        error: error.message || String(error)
                    };
                    
                    // Don't wait for this to complete, but log any errors
                    const callbackResult = streamCallback('', false, { toolExecution: toolExecutionData });
                    if (callbackResult instanceof Promise) {
                        callbackResult.catch((e: Error) => log.error(`Error sending tool execution error event: ${e.message}`));
                    }
                }

                // Return error message as result
                return {
                    toolCallId: toolCall.id,
                    name: toolCall.function.name,
                    result: `Error: ${error.message || String(error)}`
                };
            }
        }));

        const totalExecutionTime = Date.now() - executionStartTime;
        log.info(`========== TOOL EXECUTION COMPLETE ==========`);
        log.info(`Completed execution of ${toolResults.length} tools in ${totalExecutionTime}ms`);

        // Add tool results as messages
        toolResults.forEach(result => {
            // Format the result content based on type
            let content: string;

            if (typeof result.result === 'string') {
                content = result.result;
                log.info(`Tool returned string result (${content.length} chars)`);
            } else {
                // For object results, format as JSON
                try {
                    content = JSON.stringify(result.result, null, 2);
                    log.info(`Tool returned object result with keys: ${Object.keys(result.result).join(', ')}`);
                } catch (error) {
                    content = String(result.result);
                    log.info(`Failed to stringify object result: ${error}`);
                }
            }

            log.info(`Adding tool result message - Tool: ${result.name}, ID: ${result.toolCallId || 'unknown'}, Length: ${content.length}`);

            // Create a properly formatted tool response message
            updatedMessages.push({
                role: 'tool',
                content: content,
                name: result.name,
                tool_call_id: result.toolCallId
            });

            // Log a sample of the content for debugging
            const contentPreview = content.substring(0, 100) + (content.length > 100 ? '...' : '');
            log.info(`Tool result preview: ${contentPreview}`);
        });

        log.info(`Added ${toolResults.length} tool results to conversation`);

        // If we have tool results, we need a follow-up call to the LLM
        const needsFollowUp = toolResults.length > 0;

        if (needsFollowUp) {
            log.info(`Tool execution complete, LLM follow-up required with ${updatedMessages.length} messages`);
        }

        return {
            response,
            needsFollowUp,
            messages: updatedMessages
        };
    }
}
