import options from "../../options.js";
import log from "../../log.js";
import sql from "../../sql.js";
import dateUtils from "../../date_utils.js";
import { randomString } from "../../utils.js";
import type { EmbeddingProvider, EmbeddingConfig } from "./embeddings_interface.js";
import { NormalizationStatus } from "./embeddings_interface.js";
import { OpenAIEmbeddingProvider } from "./providers/openai.js";
import { OllamaEmbeddingProvider } from "./providers/ollama.js";
import { VoyageEmbeddingProvider } from "./providers/voyage.js";
import type { OptionDefinitions } from "../../options_interface.js";

/**
 * Simple local embedding provider implementation
 * This avoids the need to import a separate file which might not exist
 */
class SimpleLocalEmbeddingProvider implements EmbeddingProvider {
    name = "local";
    config: EmbeddingConfig;

    constructor(config: EmbeddingConfig) {
        this.config = config;
    }

    getConfig(): EmbeddingConfig {
        return this.config;
    }

    /**
     * Returns the normalization status of the local provider
     * Local provider does not guarantee normalization
     */
    getNormalizationStatus(): NormalizationStatus {
        return NormalizationStatus.NEVER; // Simple embedding does not normalize vectors
    }

    async generateEmbeddings(text: string): Promise<Float32Array> {
        // Create deterministic embeddings based on text content
        const result = new Float32Array(this.config.dimension || 384);

        // Simple hash-based approach
        for (let i = 0; i < result.length; i++) {
            // Use character codes and position to generate values between -1 and 1
            const charSum = Array.from(text).reduce((sum, char, idx) =>
                sum + char.charCodeAt(0) * Math.sin(idx * 0.1), 0);
            result[i] = Math.sin(i * 0.1 + charSum * 0.01);
        }

        return result;
    }

    async generateBatchEmbeddings(texts: string[]): Promise<Float32Array[]> {
        return Promise.all(texts.map(text => this.generateEmbeddings(text)));
    }

    async generateNoteEmbeddings(context: any): Promise<Float32Array> {
        // Combine text from context
        const text = (context.title || "") + " " + (context.content || "");
        return this.generateEmbeddings(text);
    }

    async generateBatchNoteEmbeddings(contexts: any[]): Promise<Float32Array[]> {
        return Promise.all(contexts.map(context => this.generateNoteEmbeddings(context)));
    }
}

const providers = new Map<string, EmbeddingProvider>();

/**
 * Register a new embedding provider
 */
export function registerEmbeddingProvider(provider: EmbeddingProvider) {
    providers.set(provider.name, provider);
    log.info(`Registered embedding provider: ${provider.name}`);
}

/**
 * Get all registered embedding providers
 */
export function getEmbeddingProviders(): EmbeddingProvider[] {
    return Array.from(providers.values());
}

/**
 * Get a specific embedding provider by name
 */
export function getEmbeddingProvider(name: string): EmbeddingProvider | undefined {
    return providers.get(name);
}

/**
 * Get all enabled embedding providers
 */
export async function getEnabledEmbeddingProviders(): Promise<EmbeddingProvider[]> {
    if (!(await options.getOptionBool('aiEnabled'))) {
        return [];
    }

    // Get provider precedence from options
    const embeddingPrecedenceStr = await options.getOption('embeddingProviderPrecedence') || '';
    const aiPrecedenceStr = await options.getOption('aiProviderPrecedence') || '';

    let enabledProviderNames: string[] = [];

    // Parse embedding provider precedence
    if (embeddingPrecedenceStr) {
        if (embeddingPrecedenceStr.includes(',')) {
            enabledProviderNames = enabledProviderNames.concat(
                embeddingPrecedenceStr.split(',').map(p => p.trim())
            );
        } else {
            enabledProviderNames.push(embeddingPrecedenceStr.trim());
        }
    }

    // Parse AI provider precedence (some may also be embedding providers)
    if (aiPrecedenceStr) {
        if (aiPrecedenceStr.includes(',')) {
            enabledProviderNames = enabledProviderNames.concat(
                aiPrecedenceStr.split(',').map(p => p.trim())
            );
        } else {
            enabledProviderNames.push(aiPrecedenceStr.trim());
        }
    }

    // Remove duplicates
    enabledProviderNames = [...new Set(enabledProviderNames)];

    // Get available providers from registered providers
    const result: EmbeddingProvider[] = [];

    // Static set to track which providers we've already logged errors for to prevent spam
    if (!(getEnabledEmbeddingProviders as any).erroredProviders) {
        (getEnabledEmbeddingProviders as any).erroredProviders = new Set<string>();
    }
    const erroredProviders = (getEnabledEmbeddingProviders as any).erroredProviders as Set<string>;

    for (const name of enabledProviderNames) {
        const provider = providers.get(name);

        if (provider) {
            result.push(provider);
            // If we previously errored about this provider but it's now available, remove from errored set
            if (erroredProviders.has(name)) {
                erroredProviders.delete(name);
            }
        } else if (!erroredProviders.has(name)) {
            // Only log the error once per provider to prevent spam
            erroredProviders.add(name);

            let errorMessage = `Embedding provider "${name}" is listed in your provider precedence, but is not available.`;

            // Add provider-specific guidance
            if (name === 'openai') {
                errorMessage += ` Make sure you have added an OpenAI API key in AI settings.`;
            } else if (name === 'ollama') {
                errorMessage += ` Make sure Ollama is running and enabled in AI settings.`;
            } else if (name === 'voyage') {
                errorMessage += ` Make sure you have added a Voyage API key in AI settings.`;
            } else if (name === 'anthropic') {
                errorMessage += ` Make sure you have added an Anthropic API key in AI settings.`;
            }

            errorMessage += ` Remove "${name}" from embeddingProviderPrecedence and aiProviderPrecedence if you don't intend to use it.`;

            log.error(errorMessage);
        }
    }

    return result;
}

/**
 * Create a new embedding provider configuration in the database
 */
export async function createEmbeddingProviderConfig(
    name: string,
    config: EmbeddingConfig,
    priority = 0
): Promise<string> {
    const providerId = randomString(16);
    const now = dateUtils.localNowDateTime();
    const utcNow = dateUtils.utcNowDateTime();

    await sql.execute(`
        INSERT INTO embedding_providers
        (providerId, name, priority, config,
         dateCreated, utcDateCreated, dateModified, utcDateModified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [providerId, name, priority, JSON.stringify(config),
         now, utcNow, now, utcNow]
    );

    return providerId;
}

/**
 * Update an existing embedding provider configuration
 */
export async function updateEmbeddingProviderConfig(
    providerId: string,
    priority?: number,
    config?: EmbeddingConfig
): Promise<boolean> {
    const now = dateUtils.localNowDateTime();
    const utcNow = dateUtils.utcNowDateTime();

    // Get existing provider
    const provider = await sql.getRow(
        "SELECT * FROM embedding_providers WHERE providerId = ?",
        [providerId]
    );

    if (!provider) {
        return false;
    }

    // Build update query parts
    const updates = [];
    const params: any[] = [];

    if (priority !== undefined) {
        updates.push("priority = ?");
        params.push(priority);
    }

    if (config) {
        updates.push("config = ?");
        params.push(JSON.stringify(config));
    }

    if (updates.length === 0) {
        return true; // Nothing to update
    }

    updates.push("dateModified = ?");
    updates.push("utcDateModified = ?");
    params.push(now, utcNow);

    params.push(providerId);

    // Execute update
    await sql.execute(
        `UPDATE embedding_providers SET ${updates.join(", ")} WHERE providerId = ?`,
        params
    );

    return true;
}

/**
 * Delete an embedding provider configuration
 */
export async function deleteEmbeddingProviderConfig(providerId: string): Promise<boolean> {
    const result = await sql.execute(
        "DELETE FROM embedding_providers WHERE providerId = ?",
        [providerId]
    );

    return result.changes > 0;
}

/**
 * Get all embedding provider configurations from the database
 */
export async function getEmbeddingProviderConfigs() {
    return await sql.getRows("SELECT * FROM embedding_providers ORDER BY priority DESC");
}

/**
 * Initialize the default embedding providers
 */
export async function initializeDefaultProviders() {
    // Register built-in providers
    try {
        // Register OpenAI provider if API key is configured
        const openaiApiKey = await options.getOption('openaiApiKey');
        if (openaiApiKey) {
            const openaiModel = await options.getOption('openaiEmbeddingModel') || 'text-embedding-3-small';
            const openaiBaseUrl = await options.getOption('openaiBaseUrl') || 'https://api.openai.com/v1';

            registerEmbeddingProvider(new OpenAIEmbeddingProvider({
                model: openaiModel,
                dimension: 1536, // OpenAI's typical dimension
                type: 'float32',
                apiKey: openaiApiKey,
                baseUrl: openaiBaseUrl
            }));

            // Create OpenAI provider config if it doesn't exist
            const existingOpenAI = await sql.getRow(
                "SELECT * FROM embedding_providers WHERE name = ?",
                ['openai']
            );

            if (!existingOpenAI) {
                await createEmbeddingProviderConfig('openai', {
                    model: openaiModel,
                    dimension: 1536,
                    type: 'float32'
                }, 100);
            }
        }

        // Register Voyage provider if API key is configured
        const voyageApiKey = await options.getOption('voyageApiKey' as any);
        if (voyageApiKey) {
            const voyageModel = await options.getOption('voyageEmbeddingModel') || 'voyage-2';
            const voyageBaseUrl = 'https://api.voyageai.com/v1';

            registerEmbeddingProvider(new VoyageEmbeddingProvider({
                model: voyageModel,
                dimension: 1024, // Voyage's embedding dimension
                type: 'float32',
                apiKey: voyageApiKey,
                baseUrl: voyageBaseUrl
            }));

            // Create Voyage provider config if it doesn't exist
            const existingVoyage = await sql.getRow(
                "SELECT * FROM embedding_providers WHERE name = ?",
                ['voyage']
            );

            if (!existingVoyage) {
                await createEmbeddingProviderConfig('voyage', {
                    model: voyageModel,
                    dimension: 1024,
                    type: 'float32'
                }, 75);
            }
        }

        // Register Ollama provider if enabled
        if (await options.getOptionBool('ollamaEnabled')) {
            const ollamaBaseUrl = await options.getOption('ollamaBaseUrl') || 'http://localhost:11434';

            // Use specific embedding models if available
            const embeddingModel = await options.getOption('ollamaEmbeddingModel') || 'nomic-embed-text';

            try {
                // Create provider with initial dimension to be updated during initialization
                const ollamaProvider = new OllamaEmbeddingProvider({
                    model: embeddingModel,
                    dimension: 768, // Initial value, will be updated during initialization
                    type: 'float32',
                    baseUrl: ollamaBaseUrl
                });

                // Register the provider
                registerEmbeddingProvider(ollamaProvider);

                // Initialize the provider to detect model capabilities
                await ollamaProvider.initialize();

                // Create Ollama provider config if it doesn't exist
                const existingOllama = await sql.getRow(
                    "SELECT * FROM embedding_providers WHERE name = ?",
                    ['ollama']
                );

                if (!existingOllama) {
                    await createEmbeddingProviderConfig('ollama', {
                        model: embeddingModel,
                        dimension: ollamaProvider.getDimension(),
                        type: 'float32'
                    }, 50);
                }
            } catch (error: any) {
                log.error(`Error initializing Ollama embedding provider: ${error.message || 'Unknown error'}`);
            }
        }

        // Always register local provider as fallback
        registerEmbeddingProvider(new SimpleLocalEmbeddingProvider({
            model: 'local',
            dimension: 384,
            type: 'float32'
        }));

        // Create local provider config if it doesn't exist
        const existingLocal = await sql.getRow(
            "SELECT * FROM embedding_providers WHERE name = ?",
            ['local']
        );

        if (!existingLocal) {
            await createEmbeddingProviderConfig('local', {
                model: 'local',
                dimension: 384,
                type: 'float32'
            }, 10);
        }
    } catch (error: any) {
        log.error(`Error initializing default embedding providers: ${error.message || 'Unknown error'}`);
    }
}

export default {
    registerEmbeddingProvider,
    getEmbeddingProviders,
    getEmbeddingProvider,
    getEnabledEmbeddingProviders,
    createEmbeddingProviderConfig,
    updateEmbeddingProviderConfig,
    deleteEmbeddingProviderConfig,
    getEmbeddingProviderConfigs,
    initializeDefaultProviders
};
