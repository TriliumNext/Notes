import options from '../../options.js';
import { BaseAIService } from '../base_ai_service.js';
import type { ChatCompletionOptions, ChatResponse, Message } from '../ai_interface.js';

export class AnthropicService extends BaseAIService {
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
        const baseUrl = options.getOption('anthropicBaseUrl') || 'https://api.anthropic.com';
        const model = opts.model || options.getOption('anthropicDefaultModel') || 'claude-3-haiku-20240307';
        const temperature = opts.temperature !== undefined
            ? opts.temperature
            : parseFloat(options.getOption('aiTemperature') || '0.7');

        const systemPrompt = this.getSystemPrompt(opts.systemPrompt || options.getOption('aiSystemPrompt'));

        // Format for Anthropic's API
        const formattedMessages = this.formatMessages(messages, systemPrompt);

        try {
            const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1/messages`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
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

    private formatMessages(messages: Message[], systemPrompt: string): { messages: any[], system: string } {
        // Extract system messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const nonSystemMessages = messages.filter(m => m.role !== 'system');

        // Combine all system messages with our default
        const combinedSystemPrompt = [systemPrompt]
            .concat(systemMessages.map(m => m.content))
            .join('\n\n');

        // Format remaining messages for Anthropic's API
        const formattedMessages = nonSystemMessages.map(m => ({
            role: m.role,
            content: m.content
        }));

        return {
            messages: formattedMessages,
            system: combinedSystemPrompt
        };
    }
}
