import { LLMProvider, LLMConfig, ChatMessage, ChatContext } from './llm_interface.js';
import { OpenAIProvider } from './providers/openai_provider.js';
import { OllamaProvider } from './providers/ollama_provider.js';
import sql from '../sql.js';
import dateUtils from '../date_utils.js';
import NotFoundError from '../../errors/not_found_error.js';
import { randomBytes } from 'crypto';

interface Note {
    noteId: string;
    title: string;
    content: string;
}

class LLMService {
    private providers: Map<string, LLMProvider>;
    private activeProvider: LLMProvider | null;
    private config: LLMConfig;
    private enabled: boolean;

    constructor() {
        this.providers = new Map();
        this.activeProvider = null;
        this.enabled = true;
        this.config = {
            provider: 'ollama',
            model: 'llama2',
            maxTokens: 2000,
            temperature: 0.7
        };

        const openaiProvider = new OpenAIProvider();
        this.registerProvider(openaiProvider);
        this.registerProvider(new OllamaProvider());
    }

    registerProvider(provider: LLMProvider) {
        this.providers.set(provider.name, provider);
    }

    async init() {
        const enabled = await sql.getValue<string>("SELECT value FROM options WHERE name = 'llmEnabled'");
        this.enabled = enabled !== 'false';
        
        if (!this.enabled) {
            return;
        }

        const providerName = await sql.getValue<string>("SELECT value FROM options WHERE name = 'llmProvider'") || 'ollama';
        const apiKey = await sql.getValue<string>("SELECT value FROM options WHERE name = 'openaiApiKey'");
        
        if (apiKey) {
            const openaiProvider = this.providers.get('openai') as OpenAIProvider;
            if (openaiProvider) {
                openaiProvider.setApiKey(apiKey);
            }
        }

        await this.setProvider(providerName);
    }

    async setProvider(name: string) {
        if (!this.enabled) {
            throw new Error('LLM integration is disabled');
        }

        const provider = this.providers.get(name);
        if (!provider) {
            throw new NotFoundError(`LLM provider ${name} not found`);
        }
        this.activeProvider = provider;
        await sql.execute("INSERT OR REPLACE INTO options (name, value, utcDateModified) VALUES (?, ?, ?)", 
            ['llmProvider', name, dateUtils.utcNowDateTime()]);
    }

    async generateEmbeddings(noteId: string, text: string) {
        if (!this.enabled) {
            throw new Error('LLM integration is disabled');
        }

        if (!this.activeProvider) {
            throw new Error('No active LLM provider');
        }

        const vector = await this.activeProvider.generateEmbeddings(text);
        const embeddingId = randomBytes(16).toString('hex');
        const now = dateUtils.utcNowDateTime();

        await sql.transactional(async () => {
            await sql.execute(`
                INSERT INTO note_embeddings 
                (embeddingId, noteId, model, vector, dimension, utcDateCreated, utcDateModified, isDeleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [embeddingId, noteId, this.config.model, Buffer.from(vector.buffer), vector.length, now, now, 0]
            );
        });

        return embeddingId;
    }

    async chat(messages: ChatMessage[], context?: ChatContext): Promise<string> {
        if (!this.enabled) {
            throw new Error('LLM integration is disabled');
        }

        if (!this.activeProvider) {
            throw new Error('No active LLM provider');
        }

        let contextText = '';
        if (context?.noteIds) {
            const notes = await sql.getRows<Note>(`
                SELECT noteId, title, content 
                FROM notes 
                WHERE noteId IN (${context.noteIds.map(() => '?').join(',')})
                AND isDeleted = 0`,
                context.noteIds
            );

            contextText = notes.map(note => 
                `Title: ${note.title}\nContent: ${note.content}`
            ).join('\n\n');
        }

        return this.activeProvider.chat(messages, contextText);
    }

    async getConfig(): Promise<LLMConfig> {
        return {
            ...this.config,
            provider: this.activeProvider?.name || 'none',
            enabled: this.enabled
        };
    }

    async updateConfig(newConfig: Partial<LLMConfig>) {
        if (newConfig.enabled !== undefined) {
            this.enabled = newConfig.enabled;
            await sql.execute("INSERT OR REPLACE INTO options (name, value, utcDateModified) VALUES (?, ?, ?)", 
                ['llmEnabled', this.enabled.toString(), dateUtils.utcNowDateTime()]);
            
            if (!this.enabled) {
                this.activeProvider = null;
                return;
            }
        }

        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.provider) {
            await this.setProvider(newConfig.provider);
        }

        if (newConfig.apiKey && this.config.provider === 'openai') {
            const openaiProvider = this.providers.get('openai') as OpenAIProvider;
            if (openaiProvider) {
                openaiProvider.setApiKey(newConfig.apiKey);
                await sql.execute("INSERT OR REPLACE INTO options (name, value, utcDateModified) VALUES (?, ?, ?)", 
                    ['openaiApiKey', newConfig.apiKey, dateUtils.utcNowDateTime()]);
            }
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }
}

export default new LLMService();
