import BasicWidget from "./basic_widget.js";
import toastService from "../services/toast.js";
import server from "../services/server.js";
import appContext from "../components/app_context.js";
import utils from "../services/utils.js";
import { t } from "../services/i18n.js";

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
    private sessionId: string | null = null;
    private currentNoteId: string | null = null;

    doRender() {
        this.$widget = $(`
            <div class="note-context-chat h-100 w-100 d-flex flex-column">
                <div class="note-context-chat-container flex-grow-1 overflow-auto p-3">
                    <div class="note-context-chat-messages"></div>
                    <div class="loading-indicator" style="display: none;">
                        <div class="spinner-border spinner-border-sm text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span class="ms-2">${t('common.processing')}...</span>
                    </div>
                </div>

                <div class="sources-container p-2 border-top" style="display: none;">
                    <h6 class="m-0 p-1">
                        <i class="bx bx-link-alt"></i> ${t('ai.sources')}
                        <span class="badge bg-secondary rounded-pill ms-2 sources-count"></span>
                    </h6>
                    <div class="sources-list mt-2"></div>
                </div>

                <form class="note-context-chat-form d-flex flex-column border-top p-2">
                    <div class="d-flex mb-2 align-items-center">
                        <div class="form-check form-switch">
                            <input class="form-check-input use-advanced-context-checkbox" type="checkbox" id="useAdvancedContext" checked>
                            <label class="form-check-label" for="useAdvancedContext">
                                ${t('ai.use_advanced_context')}
                            </label>
                        </div>
                        <div class="ms-2 small text-muted">
                            <i class="bx bx-info-circle"></i>
                            <span>${t('ai.advanced_context_helps')}</span>
                        </div>
                    </div>
                    <div class="d-flex">
                        <textarea
                            class="form-control note-context-chat-input"
                            placeholder="${t('ai.enter_message')}"
                            rows="3"
                        ></textarea>
                        <button type="submit" class="btn btn-primary note-context-chat-send-button ms-2">
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

        this.initializeEventListeners();

        // Create a session when first loaded
        this.createChatSession();

        return this.$widget;
    }

    async refresh() {
        if (!this.isVisible()) {
            return;
        }

        // Get current note context if needed
        this.currentNoteId = appContext.tabManager.getActiveContext()?.note?.noteId || null;

        if (!this.sessionId) {
            // Create a new chat session
            await this.createChatSession();
        }
    }

    private async createChatSession() {
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

        this.addMessageToChat('user', content);
        this.noteContextChatInput.value = '';
        this.showLoadingIndicator();
        this.hideSources();

        try {
            const useAdvancedContext = this.useAdvancedContextCheckbox.checked;

            // Create the message parameters
            const messageParams = {
                content,
                contextNoteId: this.currentNoteId,
                useAdvancedContext
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
            const streamUrl = `./api/llm/sessions/${this.sessionId}/messages?format=stream&useAdvancedContext=${useAdvancedContext}`;
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
        messageElement.className = `chat-message ${role}-message mb-3`;

        const avatarElement = document.createElement('div');
        avatarElement.className = 'message-avatar';
        avatarElement.innerHTML = role === 'user'
            ? '<i class="bx bx-user"></i>'
            : '<i class="bx bx-bot"></i>';

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content p-3';

        // Use a simple markdown formatter if utils.formatMarkdown is not available
        let formattedContent = content
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        contentElement.innerHTML = formattedContent;

        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);

        this.noteContextChatMessages.appendChild(messageElement);

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
            sourceElement.className = 'source-item p-2 mb-1 border rounded';

            // Create the direct link to the note
            sourceElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <a href="#root/${source.noteId}"
                       data-note-id="${source.noteId}"
                       class="source-link text-truncate"
                       title="Open note: ${source.title}">
                        <i class="bx bx-file"></i> ${source.title}
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
        // Simple markdown formatting - could be replaced with a proper markdown library
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
    }
}
