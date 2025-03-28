import options from '../../options.js';
import { BaseAIService } from '../base_ai_service.js';
import type { ChatCompletionOptions, ChatResponse, Message } from '../ai_interface.js';
import { PROVIDER_CONSTANTS } from '../constants/provider_constants.js';

interface AnthropicMessage {
    role: string;
    content: string;
}

export class AnthropicService extends BaseAIService {
    // Map of simplified model names to full model names with versions
    private static MODEL_MAPPING: Record<string, string> = {
        'claude-3-opus': 'claude-3-opus-20240229',
        'claude-3-sonnet': 'claude-3-sonnet-20240229',
        'claude-3-haiku': 'claude-3-haiku-20240307',
        'claude-2': 'claude-2.1'
    };

    constructor() {
        super('Anthropic');
    }

    isAvailable(): boolean {
        return super.isAvailable() && !!options.getOption('anthropicApiKey');
    }

    async generateChatCompletion(messages: Message[], opts: ChatCompletionOptions = {}): Promise<ChatResponse> {
        if (!this.isAvailable()) {
            throw new Error('Anthropic service is not available. Check API key and AI settings.');
        }

        const apiKey = options.getOption('anthropicApiKey');
        const baseUrl = options.getOption('anthropicBaseUrl') || PROVIDER_CONSTANTS.ANTHROPIC.BASE_URL;
        const model = opts.model || options.getOption('anthropicDefaultModel') || PROVIDER_CONSTANTS.ANTHROPIC.DEFAULT_MODEL;

        const temperature = opts.temperature !== undefined
            ? opts.temperature
            : parseFloat(options.getOption('aiTemperature') || '0.7');

        const systemPrompt = this.getSystemPrompt(opts.systemPrompt || options.getOption('aiSystemPrompt'));

        // Format for Anthropic's API
        const formattedMessages = this.formatMessages(messages, systemPrompt);

        try {
            // Ensure base URL doesn't already include '/v1' and build the complete endpoint
            const cleanBaseUrl = baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
            const endpoint = `${cleanBaseUrl}/v1/messages`;

            console.log(`Anthropic API endpoint: ${endpoint}`);
            console.log(`Using model: ${model}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': apiKey,
                    'anthropic-version': PROVIDER_CONSTANTS.ANTHROPIC.API_VERSION,
                    'anthropic-beta': PROVIDER_CONSTANTS.ANTHROPIC.BETA_VERSION
                },
                body: JSON.stringify({
                    model,
                    messages: formattedMessages.messages,
                    system: formattedMessages.system,
                    temperature,
                    max_tokens: opts.maxTokens || 4000,
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Anthropic API error (${response.status}): ${errorBody}`);
                throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json();

            return {
                text: data.content[0].text,
                model: data.model,
                provider: this.getName(),
                usage: {
                    // Anthropic doesn't provide token usage in the same format as OpenAI
                    // but we can still estimate based on input/output length
                    totalTokens: data.usage?.input_tokens + data.usage?.output_tokens
                }
            };
        } catch (error) {
            console.error('Anthropic service error:', error);
            throw error;
        }
    }

    /**
     * Format messages for the Anthropic API
     */
    private formatMessages(messages: Message[], systemPrompt: string): { messages: AnthropicMessage[], system: string } {
        const formattedMessages: AnthropicMessage[] = [];

        // Extract the system message if present
        let sysPrompt = systemPrompt;

        // Process each message
        for (const msg of messages) {
            if (msg.role === 'system') {
                // Anthropic handles system messages separately
                sysPrompt = msg.content;
            } else {
                formattedMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        return {
            messages: formattedMessages,
            system: sysPrompt
        };
    }
}
