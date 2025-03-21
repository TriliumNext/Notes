import BasicWidget from "./basic_widget.js";
import toastService from "../services/toast.js";
import server from "../services/server.js";
import appContext from "../components/app_context.js";
import utils from "../services/utils.js";
import { t } from "../services/i18n.js";
import libraryLoader from "../services/library_loader.js";
import { applySyntaxHighlight } from "../services/syntax_highlight.js";
import options from "../services/options.js";

// Import the LLM Chat CSS
(async function() {
    await libraryLoader.requireCss('stylesheets/llm_chat.css');
})();

interface ChatResponse {
    id: string;
    messages: Array<{role: string; content: string}>;
    sources?: Array<{noteId: string; title: string}>;
}

interface SessionResponse {
    id: string;
    title: string;
}

export default class LlmChatPanel extends BasicWidget {
    private noteContextChatMessages!: HTMLElement;
    private noteContextChatForm!: HTMLFormElement;
    private noteContextChatInput!: HTMLTextAreaElement;
    private noteContextChatSendButton!: HTMLButtonElement;
    private chatContainer!: HTMLElement;
    private loadingIndicator!: HTMLElement;
    private sourcesList!: HTMLElement;
    private useAdvancedContextCheckbox!: HTMLInputElement;
    private showThinkingCheckbox!: HTMLInputElement;
    private validationWarning!: HTMLElement;
    private sessionId: string | null = null;
    private currentNoteId: string | null = null;

    doRender() {
        this.$widget = $(`
            <div class="note-context-chat h-100 w-100 d-flex flex-column">
                <!-- Move validation warning outside the card with better styling -->
                <div class="provider-validation-warning alert alert-warning m-2 border-left border-warning" style="display: none; padding-left: 15px; border-left: 4px solid #ffc107; background-color: rgba(255, 248, 230, 0.9); font-size: 0.9rem; box-shadow: 0 2px 5px rgba(0,0,0,0.05);"></div>

                <div class="note-context-chat-container flex-grow-1 overflow-auto p-3">
                    <div class="note-context-chat-messages"></div>
                    <div class="loading-indicator" style="display: none;">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span class="ms-2">${t('ai.processing.common')}...</span>
                    </div>
                </div>

                <div class="sources-container p-2 border-top" style="display: none;">
                    <h6 class="m-0 p-1 d-flex align-items-center">
                        <i class="bx bx-link-alt me-1"></i> ${t('ai.sources')}
                        <span class="badge bg-primary rounded-pill ms-2 sources-count"></span>
                    </h6>
                    <div class="sources-list mt-2"></div>
                </div>

                <form class="note-context-chat-form d-flex flex-column border-top p-2">
                    <div class="d-flex mb-2 align-items-center context-option-container">
                        <div class="form-check form-switch me-3">
                            <input class="form-check-input use-advanced-context-checkbox" type="checkbox" id="useEnhancedContext" checked>
                            <label class="form-check-label" for="useEnhancedContext" title="${t('ai.enhanced_context_description')}">
                                ${t('ai.use_enhanced_context')}
                                <i class="bx bx-info-circle ms-1 small text-muted"></i>
                            </label>
                        </div>
                        <div class="form-check form-switch">
                            <input class="form-check-input show-thinking-checkbox" type="checkbox" id="showThinking">
                            <label class="form-check-label" for="showThinking" title="${t('ai.show_thinking_description')}">
                                ${t('ai.show_thinking')}
                                <i class="bx bx-info-circle ms-1 small text-muted"></i>
                            </label>
                        </div>
                    </div>
                    <div class="d-flex chat-input-container">
                        <textarea
                            class="form-control note-context-chat-input"
                            placeholder="${t('ai.enter_message')}"
                            rows="2"
                        ></textarea>
                        <button type="submit" class="btn btn-primary note-context-chat-send-button ms-2 d-flex align-items-center justify-content-center">
                            <i class="bx bx-send"></i>
                        </button>
                    </div>
                </form>
            </div>
        `);

        const element = this.$widget[0];
        this.noteContextChatMessages = element.querySelector('.note-context-chat-messages') as HTMLElement;
        this.noteContextChatForm = element.querySelector('.note-context-chat-form') as HTMLFormElement;
        this.noteContextChatInput = element.querySelector('.note-context-chat-input') as HTMLTextAreaElement;
        this.noteContextChatSendButton = element.querySelector('.note-context-chat-send-button') as HTMLButtonElement;
        this.chatContainer = element.querySelector('.note-context-chat-container') as HTMLElement;
        this.loadingIndicator = element.querySelector('.loading-indicator') as HTMLElement;
        this.sourcesList = element.querySelector('.sources-list') as HTMLElement;
        this.useAdvancedContextCheckbox = element.querySelector('.use-advanced-context-checkbox') as HTMLInputElement;
        this.showThinkingCheckbox = element.querySelector('.show-thinking-checkbox') as HTMLInputElement;
        this.validationWarning = element.querySelector('.provider-validation-warning') as HTMLElement;

        // Set up event delegation for the settings link
        this.validationWarning.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('settings-link') || target.closest('.settings-link')) {
                console.log('Settings link clicked, navigating to AI settings URL');
                window.location.href = '#root/_hidden/_options/_optionsAi';
            }
        });

        this.initializeEventListeners();

        // Create a session when first loaded
        this.createChatSession();

        return this.$widget;
    }

    async refresh() {
        if (!this.isVisible()) {
            return;
        }

        // Check for any provider validation issues when refreshing
        await this.validateEmbeddingProviders();

        // Get current note context if needed
        this.currentNoteId = appContext.tabManager.getActiveContext()?.note?.noteId || null;

        if (!this.sessionId) {
            // Create a new chat session
            await this.createChatSession();
        }
    }

    private async createChatSession() {
        // Check for validation issues first
        await this.validateEmbeddingProviders();

        try {
            const resp = await server.post<SessionResponse>('llm/sessions', {
                title: 'Note Chat'
            });

            if (resp && resp.id) {
                this.sessionId = resp.id;
            }
        } catch (error) {
            console.error('Failed to create chat session:', error);
            toastService.showError('Failed to create chat session');
        }
    }

    private async sendMessage(content: string) {
        if (!content.trim() || !this.sessionId) {
            return;
        }

        // Check for provider validation issues before sending
        await this.validateEmbeddingProviders();

        // Add user message to the chat
        this.addMessageToChat('user', content);
        this.noteContextChatInput.value = '';
        this.showLoadingIndicator();
        this.hideSources();

        try {
            const useAdvancedContext = this.useAdvancedContextCheckbox.checked;
            const showThinking = this.showThinkingCheckbox.checked;

            // Add logging to verify parameters
            console.log(`Sending message with: useAdvancedContext=${useAdvancedContext}, showThinking=${showThinking}, noteId=${this.currentNoteId}`);

            // Create the message parameters
            const messageParams = {
                content,
                contextNoteId: this.currentNoteId,
                useAdvancedContext,
                showThinking
            };

            // First, send the message via POST request
            const postResponse = await server.post<any>(`llm/sessions/${this.sessionId}/messages`, messageParams);

            // If the POST request returned content directly, display it
            if (postResponse && postResponse.content) {
                this.addMessageToChat('assistant', postResponse.content);

                // If there are sources, show them
                if (postResponse.sources && postResponse.sources.length > 0) {
                    this.showSources(postResponse.sources);
                }

                this.hideLoadingIndicator();
                return;
            }

            // Then set up streaming via EventSource
            const streamUrl = `./api/llm/sessions/${this.sessionId}/messages?format=stream&useAdvancedContext=${useAdvancedContext}&showThinking=${showThinking}`;
            const source = new EventSource(streamUrl);

            let assistantResponse = '';
            let receivedAnyContent = false;
            let timeoutId: number | null = null;

            // Set a timeout to handle case where streaming doesn't work properly
            timeoutId = window.setTimeout(() => {
                if (!receivedAnyContent) {
                    // If we haven't received any content after a reasonable timeout (10 seconds),
                    // add a fallback message and close the stream
                    this.hideLoadingIndicator();
                    this.addMessageToChat('assistant', 'I\'m having trouble generating a response right now. Please try again later.');
                    source.close();
                }
            }, 10000);

            // Handle streaming response
            source.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    // Stream completed
                    source.close();
                    this.hideLoadingIndicator();

                    // Clear the timeout since we're done
                    if (timeoutId !== null) {
                        window.clearTimeout(timeoutId);
                    }

                    // If we didn't receive any content but the stream completed normally,
                    // display a message to the user
                    if (!receivedAnyContent) {
                        this.addMessageToChat('assistant', 'I processed your request, but I don\'t have any specific information to share at the moment.');
                    }
                    return;
                }

                try {
                    const data = JSON.parse(event.data);
                    console.log("Received streaming data:", data); // Debug log

                    // Handle both content and error cases
                    if (data.content) {
                        receivedAnyContent = true;
                        assistantResponse += data.content;

                        // Update the UI with the accumulated response
                        const assistantElement = this.noteContextChatMessages.querySelector('.assistant-message:last-child .message-content');
                        if (assistantElement) {
                            assistantElement.innerHTML = this.formatMarkdown(assistantResponse);
                            // Apply syntax highlighting to any code blocks in the updated content
                            applySyntaxHighlight($(assistantElement as HTMLElement));
                        } else {
                            this.addMessageToChat('assistant', assistantResponse);
                        }
                    } else if (data.error) {
                        // Handle error message
                        this.hideLoadingIndicator();
                        this.addMessageToChat('assistant', `Error: ${data.error}`);
                        receivedAnyContent = true;
                        source.close();

                        if (timeoutId !== null) {
                            window.clearTimeout(timeoutId);
                        }
                    }

                    // Scroll to the bottom
                    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
                } catch (e) {
                    console.error('Error parsing SSE message:', e, 'Raw data:', event.data);
                }
            };

            source.onerror = () => {
                source.close();
                this.hideLoadingIndicator();

                // Clear the timeout if there was an error
                if (timeoutId !== null) {
                    window.clearTimeout(timeoutId);
                }

                // Only show error message if we haven't received any content yet
                if (!receivedAnyContent) {
                    this.addMessageToChat('assistant', 'Error connecting to the LLM service. Please try again.');
                }
            };

        } catch (error) {
            this.hideLoadingIndicator();
            toastService.showError('Error sending message: ' + (error as Error).message);
        }
    }

    private addMessageToChat(role: 'user' | 'assistant', content: string) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${role}-message mb-3 d-flex`;

        const avatarElement = document.createElement('div');
        avatarElement.className = 'message-avatar d-flex align-items-center justify-content-center me-2';

        if (role === 'user') {
            avatarElement.innerHTML = '<i class="bx bx-user"></i>';
            avatarElement.classList.add('user-avatar');
        } else {
            avatarElement.innerHTML = '<i class="bx bx-bot"></i>';
            avatarElement.classList.add('assistant-avatar');
        }

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content p-3 rounded flex-grow-1';

        if (role === 'user') {
            contentElement.classList.add('user-content', 'bg-light');
        } else {
            contentElement.classList.add('assistant-content');
        }

        // Format the content with markdown
        contentElement.innerHTML = this.formatMarkdown(content);

        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);

        this.noteContextChatMessages.appendChild(messageElement);

        // Apply syntax highlighting to any code blocks in the message
        applySyntaxHighlight($(contentElement));

        // Scroll to bottom
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    private showSources(sources: Array<{noteId: string, title: string}>) {
        this.sourcesList.innerHTML = '';

        // Update the sources count
        const sourcesCount = this.$widget[0].querySelector('.sources-count') as HTMLElement;
        if (sourcesCount) {
            sourcesCount.textContent = sources.length.toString();
        }

        sources.forEach(source => {
            const sourceElement = document.createElement('div');
            sourceElement.className = 'source-item p-2 mb-1 border rounded d-flex align-items-center';

            // Create the direct link to the note
            sourceElement.innerHTML = `
                <div class="d-flex align-items-center w-100">
                    <a href="#root/${source.noteId}"
                       data-note-id="${source.noteId}"
                       class="source-link text-truncate d-flex align-items-center"
                       title="Open note: ${source.title}">
                        <i class="bx bx-file-blank me-1"></i>
                        <span class="source-title">${source.title}</span>
                    </a>
                </div>`;

            // Add click handler for better user experience
            sourceElement.querySelector('.source-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Open the note in a new tab but don't switch to it
                appContext.tabManager.openTabWithNoteWithHoisting(source.noteId, { activate: false });

                return false; // Additional measure to prevent the event from bubbling up
            });

            this.sourcesList.appendChild(sourceElement);
        });

        const sourcesContainer = this.$widget[0].querySelector('.sources-container') as HTMLElement;
        if (sourcesContainer) {
            sourcesContainer.style.display = 'block';
        }
    }

    private hideSources() {
        const sourcesContainer = this.$widget[0].querySelector('.sources-container') as HTMLElement;
        if (sourcesContainer) {
            sourcesContainer.style.display = 'none';
        }
    }

    private showLoadingIndicator() {
        this.loadingIndicator.style.display = 'flex';
    }

    private hideLoadingIndicator() {
        this.loadingIndicator.style.display = 'none';
    }

    private initializeEventListeners() {
        this.noteContextChatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const content = this.noteContextChatInput.value;
            this.sendMessage(content);
        });

        // Add auto-resize functionality to the textarea
        this.noteContextChatInput.addEventListener('input', () => {
            this.noteContextChatInput.style.height = 'auto';
            this.noteContextChatInput.style.height = `${this.noteContextChatInput.scrollHeight}px`;
        });

        // Handle Enter key (send on Enter, new line on Shift+Enter)
        this.noteContextChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.noteContextChatForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    /**
     * Format markdown content for display
     */
    private formatMarkdown(content: string): string {
        if (!content) return '';

        // Check if content contains HTML sections for thinking visualization
        if (content.includes('<div class="thinking-process">') ||
            content.includes('<div class=\'thinking-process\'>')) {
            console.log('Detected thinking process visualization in response');
            // For content with HTML thinking visualizations, we need to protect them
        }

        // First, extract HTML thinking visualization to protect it from replacements
        const thinkingBlocks: string[] = [];
        let processedContent = content.replace(/<div class=['"](thinking-process|reasoning-process)['"][\s\S]*?<\/div>/g, (match) => {
            const placeholder = `__THINKING_BLOCK_${thinkingBlocks.length}__`;
            thinkingBlocks.push(match);
            return placeholder;
        });

        // Then extract code blocks to protect them from other replacements
        const codeBlocks: string[] = [];
        processedContent = processedContent.replace(/```(\w+)?\n([\s\S]+?)\n```/gs, (match, language, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            const languageClass = language ? ` language-${language}` : '';
            codeBlocks.push(`<pre class="code${languageClass}"><code>${code}</code></pre>`);
            return placeholder;
        });

        // Apply other markdown formatting
        processedContent = processedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        // Restore code blocks
        codeBlocks.forEach((block, index) => {
            processedContent = processedContent.replace(`__CODE_BLOCK_${index}__`, block);
        });

        // Restore thinking visualization blocks
        thinkingBlocks.forEach((block, index) => {
            processedContent = processedContent.replace(`__THINKING_BLOCK_${index}__`, block);
        });

        return processedContent;
    }

    /**
     * Validate embedding providers configuration
     * Check if there are issues with the embedding providers that might affect LLM functionality
     */
    async validateEmbeddingProviders() {
        try {
            // Check if AI is enabled
            const aiEnabled = options.is('aiEnabled');
            if (!aiEnabled) {
                this.validationWarning.style.display = 'none';
                return;
            }

            // Get the default embedding provider
            const defaultProvider = options.get('embeddingsDefaultProvider') || 'openai';

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

            // Ollama is enabled if the setting is true
            const ollamaEnabled = options.is('ollamaEnabled');
            if (ollamaEnabled) {
                enabledProviders.push('ollama');
            }

            // Local is always available
            enabledProviders.push('local');

            // Perform validation checks
            const defaultInPrecedence = precedenceList.includes(defaultProvider);
            const defaultIsEnabled = enabledProviders.includes(defaultProvider);
            const allPrecedenceEnabled = precedenceList.every((p: string) => enabledProviders.includes(p));

            // Get embedding queue status
            const embeddingStats = await server.get('embeddings/stats') as {
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
            if (!defaultInPrecedence || !defaultIsEnabled || !allPrecedenceEnabled || hasEmbeddingsInQueue) {
                let message = '<i class="bx bx-error-circle me-2"></i><strong>AI Provider Configuration Issues</strong>';

                message += '<ul class="mb-1 ps-4">';

                if (!defaultInPrecedence) {
                    message += `<li>The default embedding provider "${defaultProvider}" is not in your provider precedence list.</li>`;
                }

                if (!defaultIsEnabled) {
                    message += `<li>The default embedding provider "${defaultProvider}" is not enabled.</li>`;
                }

                if (!allPrecedenceEnabled) {
                    const disabledProviders = precedenceList.filter((p: string) => !enabledProviders.includes(p));
                    message += `<li>The following providers in your precedence list are not enabled: ${disabledProviders.join(', ')}.</li>`;
                }

                if (hasEmbeddingsInQueue) {
                    message += `<li>Currently processing embeddings for ${queuedNotes} notes. Some AI features may produce incomplete results until processing completes.</li>`;
                }

                message += '</ul>';
                message += '<div class="mt-2"><a href="javascript:" class="settings-link btn btn-sm btn-outline-secondary"><i class="bx bx-cog me-1"></i>Open AI Settings</a></div>';

                // Update HTML content - no need to attach event listeners here anymore
                this.validationWarning.innerHTML = message;
                this.validationWarning.style.display = 'block';
            } else {
                this.validationWarning.style.display = 'none';
            }
        } catch (error) {
            console.error('Error validating embedding providers:', error);
            this.validationWarning.style.display = 'none';
        }
    }
}
