import options from '../../options.js';
import { BaseAIService } from '../base_ai_service.js';
import type { ChatCompletionOptions, ChatResponse, Message } from '../ai_interface.js';
import { PROVIDER_CONSTANTS } from '../constants/provider_constants.js';

export class OpenAIService extends BaseAIService {
    constructor() {
        super('OpenAI');
    }

    isAvailable(): boolean {
        return super.isAvailable() && !!options.getOption('openaiApiKey');
    }

    async generateChatCompletion(messages: Message[], opts: ChatCompletionOptions = {}): Promise<ChatResponse> {
        if (!this.isAvailable()) {
            throw new Error('OpenAI service is not available. Check API key and AI settings.');
        }

        const apiKey = options.getOption('openaiApiKey');
        const baseUrl = options.getOption('openaiBaseUrl') || PROVIDER_CONSTANTS.OPENAI.BASE_URL;
        const model = opts.model || options.getOption('openaiDefaultModel') || PROVIDER_CONSTANTS.OPENAI.DEFAULT_MODEL;
        const temperature = opts.temperature !== undefined
            ? opts.temperature
            : parseFloat(options.getOption('aiTemperature') || '0.7');

        const systemPrompt = this.getSystemPrompt(opts.systemPrompt || options.getOption('aiSystemPrompt'));

        // Ensure we have a system message
        const systemMessageExists = messages.some(m => m.role === 'system');
        const messagesWithSystem = systemMessageExists
            ? messages
            : [{ role: 'system', content: systemPrompt }, ...messages];

        try {
            // Fix endpoint construction - ensure we don't double up on /v1
            const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
            const endpoint = normalizedBaseUrl.includes('/v1')
                ? `${normalizedBaseUrl}/chat/completions`
                : `${normalizedBaseUrl}/v1/chat/completions`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: messagesWithSystem,
                    temperature,
                    max_tokens: opts.maxTokens,
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json();

            return {
                text: data.choices[0].message.content,
                model: data.model,
                provider: this.getName(),
                usage: {
                    promptTokens: data.usage?.prompt_tokens,
                    completionTokens: data.usage?.completion_tokens,
                    totalTokens: data.usage?.total_tokens
                }
            };
        } catch (error) {
            console.error('OpenAI service error:', error);
            throw error;
        }
    }
}
