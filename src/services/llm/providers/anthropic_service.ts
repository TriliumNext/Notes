import options from '../../options.js';
import { BaseAIService } from '../base_ai_service.js';
import type { ChatCompletionOptions, ChatResponse, Message, StreamChunk } from '../ai_interface.js';
import { PROVIDER_CONSTANTS } from '../constants/provider_constants.js';
import type { AnthropicOptions } from './provider_options.js';
import { getAnthropicOptions } from './providers.js';
import log from '../../log.js';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicService extends BaseAIService {
    private client: any = null;

    constructor() {
        super('Anthropic');
    }

    isAvailable(): boolean {
        return super.isAvailable() && !!options.getOption('anthropicApiKey');
    }

    private getClient(apiKey: string, baseUrl: string, apiVersion?: string, betaVersion?: string): any {
        if (!this.client) {
            this.client = new Anthropic({
                apiKey,
                baseURL: baseUrl,
                defaultHeaders: {
                    'anthropic-version': apiVersion || PROVIDER_CONSTANTS.ANTHROPIC.API_VERSION,
                    'anthropic-beta': betaVersion || PROVIDER_CONSTANTS.ANTHROPIC.BETA_VERSION
                }
            });
        }
        return this.client;
    }

    async generateChatCompletion(messages: Message[], opts: ChatCompletionOptions = {}): Promise<ChatResponse> {
        if (!this.isAvailable()) {
            throw new Error('Anthropic service is not available. Check API key and AI settings.');
        }

        // Get provider-specific options from the central provider manager
        const providerOptions = getAnthropicOptions(opts);

        // Log provider metadata if available
        if (providerOptions.providerMetadata) {
            log.info(`Using model ${providerOptions.model} from provider ${providerOptions.providerMetadata.provider}`);

            // Log capabilities if available
            const capabilities = providerOptions.providerMetadata.capabilities;
            if (capabilities) {
                log.info(`Model capabilities: ${JSON.stringify(capabilities)}`);
            }
        }

        // Get system prompt
        const systemPrompt = this.getSystemPrompt(providerOptions.systemPrompt || options.getOption('aiSystemPrompt'));

        // Format messages for Anthropic's API
        const anthropicMessages = this.formatMessages(messages);

        try {
            // Initialize the Anthropic client
            const client = this.getClient(
                providerOptions.apiKey,
                providerOptions.baseUrl,
                providerOptions.apiVersion,
                providerOptions.betaVersion
            );

            log.info(`Using Anthropic API with model: ${providerOptions.model}`);

            // Configure request parameters
            const requestParams = {
                model: providerOptions.model,
                messages: anthropicMessages,
                system: systemPrompt,
                max_tokens: providerOptions.max_tokens || 4096,
                temperature: providerOptions.temperature,
                top_p: providerOptions.top_p,
                stream: !!providerOptions.stream
            };

            // Handle streaming responses
            if (providerOptions.stream) {
                return this.handleStreamingResponse(client, requestParams, opts, providerOptions);
            } else {
                // Non-streaming request
                const response = await client.messages.create(requestParams);

                // Get the assistant's response text from the content blocks
                const textContent = response.content
                    .filter((block: any) => block.type === 'text')
                    .map((block: any) => block.text)
                    .join('');

                return {
                    text: textContent,
                    model: response.model,
                    provider: this.getName(),
                    usage: {
                        // Anthropic provides token counts in the response
                        promptTokens: response.usage?.input_tokens,
                        completionTokens: response.usage?.output_tokens,
                        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
                    }
                };
            }
        } catch (error) {
            log.error(`Anthropic service error: ${error}`);
            throw error;
        }
    }

    /**
     * Handle streaming response from Anthropic
     */
    private async handleStreamingResponse(
        client: any,
        params: any,
        opts: ChatCompletionOptions,
        providerOptions: AnthropicOptions
    ): Promise<ChatResponse> {
        let completeText = '';

        // Create a function that will return a Promise that resolves with the final text
        const streamHandler = async (callback: (chunk: StreamChunk) => Promise<void> | void): Promise<string> => {
            try {
                const streamResponse = await client.messages.create({
                    ...params,
                    stream: true
                });

                for await (const chunk of streamResponse) {
                    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
                        const text = chunk.delta.text || '';
                        completeText += text;
                        
                        // Call the callback with the chunk
                        await callback({
                            text,
                            done: false,
                            usage: {} // Usage stats not available in chunks
                        });
                    }
                }

                // Signal completion
                await callback({
                    text: '',
                    done: true,
                    usage: {
                        // We don't have token usage information in streaming mode from the chunks
                        totalTokens: completeText.length / 4 // Rough estimate
                    }
                });

                return completeText;
            } catch (error) {
                log.error(`Error in Anthropic streaming: ${error}`);
                throw error;
            }
        };

        // If a stream callback was provided in the options, set up immediate streaming
        if (opts.streamCallback) {
            // Start streaming in the background
            void streamHandler(async (chunk) => {
                if (opts.streamCallback) {
                    await opts.streamCallback(chunk.text, chunk.done);
                }
            });
        }

        return {
            text: completeText, // This will be empty initially until streaming completes
            model: providerOptions.model,
            provider: this.getName(),
            stream: streamHandler,
            usage: {
                // We don't have token counts initially with streaming
                totalTokens: 0
            }
        };
    }

    /**
     * Format messages for the Anthropic API
     */
    private formatMessages(messages: Message[]): any[] {
        const anthropicMessages: any[] = [];

        // Process each message
        for (const msg of messages) {
            if (msg.role === 'system') {
                // System messages are handled separately in the API call
                continue;
            } else if (msg.role === 'user' || msg.role === 'assistant') {
                // Convert to Anthropic format
                anthropicMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            } else if (msg.role === 'tool') {
                // Tool response messages - typically follow a tool call from the assistant
                anthropicMessages.push({
                    role: 'user',
                    content: msg.content
                });
            }
        }

        return anthropicMessages;
    }
}