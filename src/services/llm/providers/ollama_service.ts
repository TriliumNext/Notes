import options from '../../options.js';
import { BaseAIService } from '../base_ai_service.js';
import type { Message, ChatCompletionOptions, ChatResponse } from '../ai_interface.js';
import { OllamaMessageFormatter } from '../formatters/ollama_formatter.js';
import log from '../../log.js';
import type { ToolCall } from '../tools/tool_interfaces.js';
import toolRegistry from '../tools/tool_registry.js';
import type { OllamaOptions } from './provider_options.js';
import { getOllamaOptions } from './providers.js';
import { Ollama, type ChatRequest, type ChatResponse as OllamaChatResponse } from 'ollama';

// Add an interface for tool execution feedback status
interface ToolExecutionStatus {
    toolCallId: string;
    name: string;
    success: boolean;
    result: string;
    error?: string;
}

export class OllamaService extends BaseAIService {
    private formatter: OllamaMessageFormatter;
    private client: Ollama | null = null;

    constructor() {
        super('Ollama');
        this.formatter = new OllamaMessageFormatter();
    }

    isAvailable(): boolean {
        return super.isAvailable() && !!options.getOption('ollamaBaseUrl');
    }

    private getClient(): Ollama {
        if (!this.client) {
            const baseUrl = options.getOption('ollamaBaseUrl');
            if (!baseUrl) {
                throw new Error('Ollama base URL is not configured');
            }
            this.client = new Ollama({ host: baseUrl });
        }
        return this.client;
    }

    async generateChatCompletion(messages: Message[], opts: ChatCompletionOptions = {}): Promise<ChatResponse> {
        if (!this.isAvailable()) {
            throw new Error('Ollama service is not available. Check API URL in settings.');
        }

        // Get provider-specific options from the central provider manager
        const providerOptions = await getOllamaOptions(opts);

        // Log provider metadata if available
        if (providerOptions.providerMetadata) {
            log.info(`Using model ${providerOptions.model} from provider ${providerOptions.providerMetadata.provider}`);

            // Log capabilities if available
            const capabilities = providerOptions.providerMetadata.capabilities;
            if (capabilities) {
                log.info(`Model capabilities: ${JSON.stringify(capabilities)}`);
            }
        }

        const systemPrompt = this.getSystemPrompt(providerOptions.systemPrompt || options.getOption('aiSystemPrompt'));

        try {
            // Check if we should add tool execution feedback
            if (providerOptions.toolExecutionStatus && Array.isArray(providerOptions.toolExecutionStatus) && providerOptions.toolExecutionStatus.length > 0) {
                log.info(`Adding tool execution feedback to messages`);
                messages = this.addToolExecutionFeedback(messages, providerOptions.toolExecutionStatus);
            }

            // Determine whether to use the formatter or send messages directly
            let messagesToSend: Message[];

            if (providerOptions.bypassFormatter) {
                // Bypass the formatter entirely - use messages as is
                messagesToSend = [...messages];
                log.info(`Bypassing formatter for Ollama request with ${messages.length} messages`);
            } else {
                // Use the formatter to prepare messages
                messagesToSend = this.formatter.formatMessages(
                    messages,
                    systemPrompt,
                    undefined, // context
                    providerOptions.preserveSystemPrompt
                );
                log.info(`Sending to Ollama with formatted messages: ${messagesToSend.length}`);
            }

            // Log request details
            log.info(`========== OLLAMA API REQUEST ==========`);
            log.info(`Model: ${providerOptions.model}, Messages: ${messagesToSend.length}`);
            log.info(`Stream: ${opts.streamCallback ? true : false}`);
            
            // Get tools if enabled
            let tools = [];
            if (providerOptions.enableTools !== false) {
                try {
                    tools = providerOptions.tools && providerOptions.tools.length > 0
                        ? providerOptions.tools
                        : toolRegistry.getAllToolDefinitions();

                    // Handle empty tools array
                    if (tools.length === 0) {
                        log.info('No tools found, attempting to initialize tools...');
                        const toolInitializer = await import('../tools/tool_initializer.js');
                        await toolInitializer.default.initializeTools();
                        tools = toolRegistry.getAllToolDefinitions();
                        log.info(`After initialization: ${tools.length} tools available`);
                    }

                    if (tools.length > 0) {
                        log.info(`Sending ${tools.length} tool definitions to Ollama`);
                    }
                } catch (error: any) {
                    log.error(`Error preparing tools: ${error.message || String(error)}`);
                    tools = []; // Empty fallback
                }
            }

            // Check message structure and log detailed information about each message
            messagesToSend.forEach((msg: any, index: number) => {
                const keys = Object.keys(msg);
                log.info(`Message ${index}, Role: ${msg.role}, Keys: ${keys.join(', ')}`);

                // Log message content preview
                if (msg.content && typeof msg.content === 'string') {
                    const contentPreview = msg.content.length > 200
                        ? `${msg.content.substring(0, 200)}...`
                        : msg.content;
                    log.info(`Message ${index} content: ${contentPreview}`);
                }

                // Log tool-related details
                if (keys.includes('tool_calls')) {
                    log.info(`Message ${index} has ${msg.tool_calls.length} tool calls`);
                }

                if (keys.includes('tool_call_id')) {
                    log.info(`Message ${index} is a tool response for tool call ID: ${msg.tool_call_id}`);
                }

                if (keys.includes('name') && msg.role === 'tool') {
                    log.info(`Message ${index} is from tool: ${msg.name}`);
                }
            });

            // Get client instance
            const client = this.getClient();
            
            // Convert our message format to Ollama's format
            const convertedMessages = messagesToSend.map(msg => {
                const converted: any = {
                    role: msg.role,
                    content: msg.content
                };
                
                if (msg.tool_calls) {
                    converted.tool_calls = msg.tool_calls.map(tc => {
                        // For Ollama, arguments must be an object, not a string
                        let processedArgs = tc.function.arguments;
                        
                        // If arguments is a string, try to parse it as JSON
                        if (typeof processedArgs === 'string') {
                            try {
                                processedArgs = JSON.parse(processedArgs);
                            } catch (e) {
                                // If parsing fails, create an object with a single property
                                log.info(`Could not parse tool arguments as JSON: ${e}`);
                                processedArgs = { raw: processedArgs };
                            }
                        }
                        
                        return {
                            id: tc.id,
                            function: {
                                name: tc.function.name,
                                arguments: processedArgs
                            }
                        };
                    });
                }
                
                if (msg.tool_call_id) {
                    converted.tool_call_id = msg.tool_call_id;
                }
                
                if (msg.name) {
                    converted.name = msg.name;
                }
                
                return converted;
            });
            
            // Prepare base request options
            const baseRequestOptions = {
                model: providerOptions.model,
                messages: convertedMessages,
                options: providerOptions.options,
                // Add tools if available
                tools: tools.length > 0 ? tools : undefined
            };

            // Handle streaming
            if (opts.streamCallback) {
                let responseText = '';
                let responseToolCalls: any[] = [];
                
                log.info(`Using streaming mode with Ollama client`);
                
                let streamResponse: OllamaChatResponse | null = null;
                
                // Create streaming request
                const streamingRequest = {
                    ...baseRequestOptions,
                    stream: true as const // Use const assertion to fix the type
                };
                
                // Get the async iterator
                const streamIterator = await client.chat(streamingRequest);
                
                // Process each chunk
                for await (const chunk of streamIterator) {
                    // Save the last chunk for final stats
                    streamResponse = chunk;
                    
                    // Accumulate text
                    if (chunk.message?.content) {
                        responseText += chunk.message.content;
                    }
                    
                    // Check for tool calls
                    if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
                        responseToolCalls = [...chunk.message.tool_calls];
                    }
                    
                    // Call the callback with the current chunk content
                    if (opts.streamCallback) {
                        // Original callback expects text content, isDone flag, and optional original chunk
                        opts.streamCallback(
                            chunk.message?.content || '', 
                            !!chunk.done, 
                            chunk
                        );
                    }
                }
                
                // Create the final response after streaming is complete
                return {
                    text: responseText,
                    model: providerOptions.model,
                    provider: this.getName(),
                    tool_calls: this.transformToolCalls(responseToolCalls),
                    usage: {
                        promptTokens: streamResponse?.prompt_eval_count || 0,
                        completionTokens: streamResponse?.eval_count || 0,
                        totalTokens: (streamResponse?.prompt_eval_count || 0) + (streamResponse?.eval_count || 0)
                    }
                };
            } else {
                // Non-streaming request
                log.info(`Using non-streaming mode with Ollama client`);
                
                // Create non-streaming request
                const nonStreamingRequest = {
                    ...baseRequestOptions,
                    stream: false as const // Use const assertion for type safety
                };
                
                const response = await client.chat(nonStreamingRequest);
                
                // Log response details
                log.info(`========== OLLAMA API RESPONSE ==========`);
                log.info(`Model: ${response.model}, Content length: ${response.message?.content?.length || 0} chars`);
                log.info(`Tokens: ${response.prompt_eval_count || 0} prompt, ${response.eval_count || 0} completion, ${(response.prompt_eval_count || 0) + (response.eval_count || 0)} total`);
                
                // Log content preview
                const contentPreview = response.message?.content && response.message.content.length > 300
                    ? `${response.message.content.substring(0, 300)}...`
                    : response.message?.content || '';
                log.info(`Response content: ${contentPreview}`);
                
                // Handle the response and extract tool calls if present
                const chatResponse: ChatResponse = {
                    text: response.message?.content || '',
                    model: response.model || providerOptions.model,
                    provider: this.getName(),
                    usage: {
                        promptTokens: response.prompt_eval_count || 0,
                        completionTokens: response.eval_count || 0,
                        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
                    }
                };
                
                // Add tool calls if present
                if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
                    log.info(`Ollama response includes ${response.message.tool_calls.length} tool calls`);
                    chatResponse.tool_calls = this.transformToolCalls(response.message.tool_calls);
                    log.info(`Transformed tool calls: ${JSON.stringify(chatResponse.tool_calls)}`);
                }
                
                log.info(`========== END OLLAMA RESPONSE ==========`);
                return chatResponse;
            }
        } catch (error: any) {
            // Enhanced error handling with detailed diagnostics
            log.error(`Ollama service error: ${error.message || String(error)}`);
            if (error.stack) {
                log.error(`Error stack trace: ${error.stack}`);
            }

            // Propagate the original error
            throw error;
        }
    }

    /**
     * Transform Ollama tool calls to the standard format expected by the pipeline
     */
    private transformToolCalls(toolCalls: any[] | undefined): ToolCall[] {
        if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
            return [];
        }
        
        return toolCalls.map((toolCall, index) => {
            // Generate a unique ID if none is provided
            const id = toolCall.id || `tool-call-${Date.now()}-${index}`;
            
            // Handle arguments based on their type
            let processedArguments: Record<string, any> | string = toolCall.function?.arguments || {};
            
            if (typeof processedArguments === 'string') {
                try {
                    processedArguments = JSON.parse(processedArguments);
                } catch (error) {
                    // If we can't parse as JSON, create a simple object
                    log.info(`Could not parse tool arguments as JSON in transformToolCalls: ${error}`);
                    processedArguments = { raw: processedArguments };
                }
            }
            
            return {
                id,
                type: 'function',
                function: {
                    name: toolCall.function?.name || '',
                    arguments: processedArguments
                }
            };
        });
    }

    /**
     * Adds a system message with feedback about tool execution status
     * @param messages The current message array
     * @param toolExecutionStatus Array of tool execution status objects
     * @returns Updated message array with feedback
     */
    private addToolExecutionFeedback(messages: Message[], toolExecutionStatus: ToolExecutionStatus[]): Message[] {
        if (!toolExecutionStatus || toolExecutionStatus.length === 0) {
            return messages;
        }

        // Create a copy of the messages
        const updatedMessages = [...messages];

        // Create a feedback message that explains what happened with each tool call
        let feedbackContent = `Tool execution feedback:\n\n`;

        toolExecutionStatus.forEach((status, index) => {
            // Add status for each tool
            const statusText = status.success ? 'successfully executed' : 'failed to execute';
            const toolName = status.name || 'unknown tool';

            feedbackContent += `Tool call ${index + 1} (${toolName}): ${statusText}\n`;

            // Add error information if available and tool failed
            if (!status.success && status.error) {
                feedbackContent += `Error: ${status.error}\n`;
                feedbackContent += `Please fix this issue in your next response or try a different approach.\n`;
            }

            feedbackContent += `\n`;
        });

        // Add feedback message to the conversation
        updatedMessages.push({
            role: 'system',
            content: feedbackContent
        });

        log.info(`Added tool execution feedback: ${toolExecutionStatus.length} statuses`);
        return updatedMessages;
    }
}
