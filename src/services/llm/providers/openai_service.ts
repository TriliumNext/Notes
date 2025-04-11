import options from '../../options.js';
import { BaseAIService } from '../base_ai_service.js';
import type { ChatCompletionOptions, ChatResponse, Message } from '../ai_interface.js';
import { getOpenAIOptions } from './providers.js';
import OpenAI from 'openai';

export class OpenAIService extends BaseAIService {
    private openai: OpenAI | null = null;

    constructor() {
        super('OpenAI');
    }

    isAvailable(): boolean {
        return super.isAvailable() && !!options.getOption('openaiApiKey');
    }

    private getClient(apiKey: string, baseUrl?: string): OpenAI {
        if (!this.openai) {
            this.openai = new OpenAI({
                apiKey,
                baseURL: baseUrl
            });
        }
        return this.openai;
    }

    async generateChatCompletion(messages: Message[], opts: ChatCompletionOptions = {}): Promise<ChatResponse> {
        if (!this.isAvailable()) {
            throw new Error('OpenAI service is not available. Check API key and AI settings.');
        }

        // Get provider-specific options from the central provider manager
        const providerOptions = getOpenAIOptions(opts);
        
        // Initialize the OpenAI client
        const client = this.getClient(providerOptions.apiKey, providerOptions.baseUrl);

        const systemPrompt = this.getSystemPrompt(providerOptions.systemPrompt || options.getOption('aiSystemPrompt'));

        // Ensure we have a system message
        const systemMessageExists = messages.some(m => m.role === 'system');
        const messagesWithSystem = systemMessageExists
            ? messages
            : [{ role: 'system', content: systemPrompt }, ...messages];

        try {
            // Create params object for the OpenAI SDK
            const params: OpenAI.Chat.ChatCompletionCreateParams = {
                model: providerOptions.model,
                messages: messagesWithSystem as OpenAI.Chat.ChatCompletionMessageParam[],
                temperature: providerOptions.temperature,
                max_tokens: providerOptions.max_tokens,
                stream: providerOptions.stream,
                top_p: providerOptions.top_p,
                frequency_penalty: providerOptions.frequency_penalty,
                presence_penalty: providerOptions.presence_penalty
            };

            // Add tools if enabled
            if (providerOptions.enableTools && providerOptions.tools && providerOptions.tools.length > 0) {
                params.tools = providerOptions.tools as OpenAI.Chat.ChatCompletionTool[];
            }

            if (providerOptions.tool_choice) {
                params.tool_choice = providerOptions.tool_choice as OpenAI.Chat.ChatCompletionToolChoiceOption;
            }

            // If streaming is requested
            if (providerOptions.stream) {
                params.stream = true;
                
                const stream = await client.chat.completions.create(params);
                let fullText = '';
                
                // If a direct callback is provided, use it
                if (providerOptions.streamCallback) {
                    // Process the stream with the callback
                    try {
                        // The stream is an AsyncIterable
                        if (Symbol.asyncIterator in stream) {
                            for await (const chunk of stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
                                const content = chunk.choices[0]?.delta?.content || '';
                                if (content) {
                                    fullText += content;
                                    await providerOptions.streamCallback(content, false, chunk);
                                }
                                
                                // If this is the last chunk
                                if (chunk.choices[0]?.finish_reason) {
                                    await providerOptions.streamCallback('', true, chunk);
                                }
                            }
                        } else {
                            console.error('Stream is not iterable, falling back to non-streaming response');
                            
                            // If we get a non-streaming response somehow
                            if ('choices' in stream) {
                                const content = stream.choices[0]?.message?.content || '';
                                fullText = content;
                                if (providerOptions.streamCallback) {
                                    await providerOptions.streamCallback(content, true, stream);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error processing stream:', error);
                        throw error;
                    }
                    
                    return {
                        text: fullText,
                        model: params.model,
                        provider: this.getName(),
                        usage: {} // Usage stats aren't available with streaming
                    };
                } else {
                    // Use the more flexible stream interface
                    return {
                        text: '', // Initial empty text, will be filled by stream processing
                        model: params.model,
                        provider: this.getName(),
                        usage: {}, // Usage stats aren't available with streaming
                        stream: async (callback) => {
                            let completeText = '';
                            
                            try {
                                // The stream is an AsyncIterable
                                if (Symbol.asyncIterator in stream) {
                                    for await (const chunk of stream as AsyncIterable<OpenAI.Chat.ChatCompletionChunk>) {
                                        const content = chunk.choices[0]?.delta?.content || '';
                                        const isDone = !!chunk.choices[0]?.finish_reason;
                                        
                                        if (content) {
                                            completeText += content;
                                        }
                                        
                                        // Call the provided callback with the StreamChunk interface
                                        await callback({
                                            text: content,
                                            done: isDone
                                        });
                                        
                                        if (isDone) {
                                            break;
                                        }
                                    }
                                } else {
                                    console.warn('Stream is not iterable, falling back to non-streaming response');
                                    
                                    // If we get a non-streaming response somehow
                                    if ('choices' in stream) {
                                        const content = stream.choices[0]?.message?.content || '';
                                        completeText = content;
                                        await callback({
                                            text: content,
                                            done: true
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error('Error processing stream:', error);
                                throw error;
                            }
                            
                            return completeText;
                        }
                    };
                }
            } else {
                // Non-streaming response
                params.stream = false;
                
                const completion = await client.chat.completions.create(params);
                
                if (!('choices' in completion)) {
                    throw new Error('Unexpected response format from OpenAI API');
                }

                return {
                    text: completion.choices[0].message.content || '',
                    model: completion.model,
                    provider: this.getName(),
                    usage: {
                        promptTokens: completion.usage?.prompt_tokens,
                        completionTokens: completion.usage?.completion_tokens,
                        totalTokens: completion.usage?.total_tokens
                    },
                    tool_calls: completion.choices[0].message.tool_calls
                };
            }
        } catch (error) {
            console.error('OpenAI service error:', error);
            throw error;
        }
    }
}
