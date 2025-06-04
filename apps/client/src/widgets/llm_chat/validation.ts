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

        // Get selected chat provider
        const selectedProvider = options.get('aiChatProvider');
        if (!selectedProvider) {
            // No provider configured, hide validation
            validationWarning.style.display = 'none';
            return;
        }
        
        // Check for configuration issues with the selected provider
        const configIssues: string[] = [];
        
        if (selectedProvider === 'openai') {
            // Check OpenAI configuration
            const apiKey = options.get('openaiApiKey');
            if (!apiKey) {
                configIssues.push(`OpenAI API key is missing`);
            }
        } else if (selectedProvider === 'anthropic') {
            // Check Anthropic configuration
            const apiKey = options.get('anthropicApiKey');
            if (!apiKey) {
                configIssues.push(`Anthropic API key is missing`);
            }
        } else if (selectedProvider === 'ollama') {
            // Check Ollama configuration
            const baseUrl = options.get('ollamaBaseUrl');
            if (!baseUrl) {
                configIssues.push(`Ollama Base URL is missing`);
            }
        }

        // Fetch embedding stats to check if there are any notes being processed
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

        // Show warning if there are configuration issues or embeddings in queue
        if (configIssues.length > 0 || hasEmbeddingsInQueue) {
            let message = '<i class="bx bx-error-circle me-2"></i><strong>AI Provider Configuration Issues</strong>';

            message += '<ul class="mb-1 ps-4">';

            // Show configuration issues
            for (const issue of configIssues) {
                message += `<li>${issue}</li>`;
            }
            
            // Show warning about embeddings queue if applicable
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
