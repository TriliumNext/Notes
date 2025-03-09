import options from '../options.js';
import { BaseAIService } from './base_ai_service.js';
import type { ChatCompletionOptions, ChatResponse, Message } from './ai_interface.js';

export class OllamaService extends BaseAIService {
    constructor() {
        super('Ollama');
    }

    isAvailable(): boolean {
        return super.isAvailable() &&
               options.getOption('ollamaEnabled') === 'true' &&
               !!options.getOption('ollamaBaseUrl');
    }

    async generateChatCompletion(messages: Message[], opts: ChatCompletionOptions = {}): Promise<ChatResponse> {
        if (!this.isAvailable()) {
            throw new Error('Ollama service is not available. Check Ollama settings.');
        }

        const baseUrl = options.getOption('ollamaBaseUrl') || 'http://localhost:11434';
        const model = opts.model || options.getOption('ollamaDefaultModel') || 'llama2';
        const temperature = opts.temperature !== undefined
            ? opts.temperature
            : parseFloat(options.getOption('aiTemperature') || '0.7');

        const systemPrompt = this.getSystemPrompt(opts.systemPrompt || options.getOption('aiSystemPrompt'));

        // Format messages for Ollama
        const formattedMessages = this.formatMessages(messages, systemPrompt);

        try {
            const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/chat`;

            // Determine if we should stream the response
            const shouldStream = opts.stream === true;

            if (shouldStream) {
                // Handle streaming response
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        messages: formattedMessages,
                        stream: true,
                        options: {
                            temperature,
                        }
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`);
                }

                // For streaming, we return an object that has a callback for handling the stream
                return {
                    text: "", // Initial empty text that will be built up
                    model: model,
                    provider: this.getName(),
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    },
                    stream: async (callback) => {
                        if (!response.body) {
                            throw new Error("No response body from Ollama");
                        }

                        const reader = response.body.getReader();
                        let fullText = "";
                        let partialLine = "";

                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                // Convert the chunk to text
                                const chunk = new TextDecoder().decode(value);
                                partialLine += chunk;

                                // Split by lines and process each complete JSON object
                                const lines = partialLine.split('\n');

                                // Process all complete lines except the last one (which might be incomplete)
                                for (let i = 0; i < lines.length - 1; i++) {
                                    const line = lines[i].trim();
                                    if (!line) continue;

                                    try {
                                        const data = JSON.parse(line);
                                        console.log("Streaming chunk received:", data);

                                        if (data.message && data.message.content) {
                                            // Extract just the new content
                                            const newContent = data.message.content;
                                            // Add to full text
                                            fullText += newContent;
                                            // Call the callback with the new content
                                            await callback({
                                                text: newContent,
                                                done: false
                                            });
                                        }

                                        if (data.done) {
                                            // Final message in the stream
                                            await callback({
                                                text: "",
                                                done: true,
                                                usage: {
                                                    promptTokens: data.prompt_eval_count || 0,
                                                    completionTokens: data.eval_count || 0,
                                                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                                                }
                                            });
                                        }
                                    } catch (err) {
                                        console.error("Error parsing JSON from Ollama stream:", err, "Line:", line);
                                    }
                                }

                                // Keep the potentially incomplete last line for the next iteration
                                partialLine = lines[lines.length - 1];
                            }

                            // Handle any remaining content in partialLine
                            if (partialLine.trim()) {
                                try {
                                    const data = JSON.parse(partialLine.trim());
                                    if (data.message && data.message.content) {
                                        fullText += data.message.content;
                                        await callback({
                                            text: data.message.content,
                                            done: false
                                        });
                                    }
                                } catch (err) {
                                    console.error("Error parsing final JSON from Ollama stream:", err);
                                }
                            }

                            return fullText;
                        } catch (err) {
                            console.error("Error reading Ollama stream:", err);
                            throw err;
                        }
                    }
                };
            } else {
                // Non-streaming response - explicitly request JSON format
                console.log("Sending to Ollama with formatted messages:", JSON.stringify(formattedMessages, null, 2));

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        messages: formattedMessages,
                        stream: false,
                        options: {
                            temperature,
                        }
                    })
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorBody}`);
                }

                const rawResponseText = await response.text();
                console.log("Raw response from Ollama:", rawResponseText);

                let data;

                try {
                    data = JSON.parse(rawResponseText);
                    console.log("Parsed Ollama response:", JSON.stringify(data, null, 2));
                } catch (err: any) {
                    console.error("Error parsing JSON response from Ollama:", err);
                    console.error("Raw response:", rawResponseText);
                    throw new Error(`Failed to parse Ollama response as JSON: ${err.message}`);
                }

                // Check for empty or JSON object responses
                const content = data.message?.content || '';
                let finalResponseText = content;

                if (content === '{}' || content === '{  }' || content === '{ }') {
                    finalResponseText = "I don't have information about that in my notes.";
                } else if (!content.trim()) {
                    finalResponseText = "No response was generated. Please try asking a different question.";
                }

                return {
                    text: finalResponseText,
                    model: data.model || model,
                    provider: this.getName(),
                    usage: {
                        promptTokens: data.prompt_eval_count || 0,
                        completionTokens: data.eval_count || 0,
                        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                    }
                };
            }
        } catch (error: any) {
            console.error("Ollama service error:", error);
            throw new Error(`Ollama service error: ${error.message}`);
        }
    }

    private formatMessages(messages: Message[], systemPrompt: string): any[] {
        console.log("Input messages for formatting:", JSON.stringify(messages, null, 2));

        // Check if there are any messages with empty content
        const emptyMessages = messages.filter(msg => !msg.content || msg.content === "Empty message");
        if (emptyMessages.length > 0) {
            console.warn("Found messages with empty content:", emptyMessages);
        }

        // Add system message if it doesn't exist
        const hasSystemMessage = messages.some(m => m.role === 'system');
        let resultMessages = [...messages];

        if (!hasSystemMessage && systemPrompt) {
            resultMessages.unshift({
                role: 'system',
                content: systemPrompt
            });
        }

        // Validate each message has content
        resultMessages = resultMessages.map(msg => {
            // Ensure each message has a valid content
            if (!msg.content || typeof msg.content !== 'string') {
                console.warn(`Message with role ${msg.role} has invalid content:`, msg.content);
                return {
                    ...msg,
                    content: msg.content || "Empty message"
                };
            }
            return msg;
        });

        console.log("Formatted messages for Ollama:", JSON.stringify(resultMessages, null, 2));

        // Ollama uses the same format as OpenAI for messages
        return resultMessages;
    }
}
