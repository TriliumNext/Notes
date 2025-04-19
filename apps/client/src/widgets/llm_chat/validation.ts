/**
 * Validation functions for LLM Chat
 */
import options from "../../services/options.js";
import { getEmbeddingStats } from "./communication.js";

/**
 * Validate embedding providers configuration
 */
export async function validateEmbeddingProviders(validationWarning: HTMLElement): Promise<void> {
    try {
        // Check if AI is enabled
        const aiEnabled = options.is('aiEnabled');
        if (!aiEnabled) {
            validationWarning.style.display = 'none';
            return;
        }

        // Get provider precedence
        const precedenceStr = options.get('aiProviderPrecedence') || 'openai,anthropic,ollama';
        let precedenceList: string[] = [];

        if (precedenceStr) {
            if (precedenceStr.startsWith('[') && precedenceStr.endsWith(']')) {
                precedenceList = JSON.parse(precedenceStr);
            } else if (precedenceStr.includes(',')) {
                precedenceList = precedenceStr.split(',').map(p => p.trim());
            } else {
                precedenceList = [precedenceStr];
            }
        }

        // Get enabled providers - this is a simplification since we don't have direct DB access
        // We'll determine enabled status based on the presence of keys or settings
        const enabledProviders: string[] = [];

        // OpenAI is enabled if API key is set
        const openaiKey = options.get('openaiApiKey');
        if (openaiKey) {
            enabledProviders.push('openai');
        }

        // Anthropic is enabled if API key is set
        const anthropicKey = options.get('anthropicApiKey');
        if (anthropicKey) {
            enabledProviders.push('anthropic');
        }

        // Ollama is enabled if base URL is set
        const ollamaBaseUrl = options.get('ollamaBaseUrl');
        if (ollamaBaseUrl) {
            enabledProviders.push('ollama');
        }

        // Local is always available
        enabledProviders.push('local');

        // Perform validation checks
        const allPrecedenceEnabled = precedenceList.every((p: string) => enabledProviders.includes(p));

        // Get embedding queue status
        const embeddingStats = await getEmbeddingStats() as {
            success: boolean,
            stats: {
                totalNotesCount: number;
                embeddedNotesCount: number;
                queuedNotesCount: number;
                failedNotesCount: number;
                lastProcessedDate: string | null;
                percentComplete: number;
            }
        };
        const queuedNotes = embeddingStats?.stats?.queuedNotesCount || 0;
        const hasEmbeddingsInQueue = queuedNotes > 0;

        // Show warning if there are issues
        if (!allPrecedenceEnabled || hasEmbeddingsInQueue) {
            let message = '<i class="bx bx-error-circle me-2"></i><strong>AI Provider Configuration Issues</strong>';

            message += '<ul class="mb-1 ps-4">';

            if (!allPrecedenceEnabled) {
                const disabledProviders = precedenceList.filter((p: string) => !enabledProviders.includes(p));
                message += `<li>The following providers in your precedence list are not enabled: ${disabledProviders.join(', ')}.</li>`;
            }

            if (hasEmbeddingsInQueue) {
                message += `<li>Currently processing embeddings for ${queuedNotes} notes. Some AI features may produce incomplete results until processing completes.</li>`;
            }

            message += '</ul>';
            message += '<div class="mt-2"><a href="javascript:" class="settings-link btn btn-sm btn-outline-secondary"><i class="bx bx-cog me-1"></i>Open AI Settings</a></div>';

            // Update HTML content
            validationWarning.innerHTML = message;
            validationWarning.style.display = 'block';
        } else {
            validationWarning.style.display = 'none';
        }
    } catch (error) {
        console.error('Error validating embedding providers:', error);
        validationWarning.style.display = 'none';
    }
}
