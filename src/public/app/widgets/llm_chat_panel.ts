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
                    <h6 class="m-0 p-1">${t('ai.sources')}</h6>
                    <div class="sources-list"></div>
                </div>

                <form class="note-context-chat-form d-flex border-top p-2">
                    <textarea
                        class="form-control note-context-chat-input"
                        placeholder="${t('ai.enter_message')}"
                        rows="3"
                    ></textarea>
                    <button type="submit" class="btn btn-primary note-context-chat-send-button ms-2">
                        <i class="bx bx-send"></i>
                    </button>
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

        this.showLoadingIndicator();

        try {
            // Add user message to chat
            this.addMessageToChat('user', content);
            this.noteContextChatInput.value = '';

            // Get AI settings
            const useRAG = true; // Always use RAG for this widget

            // Send message to server
            const response = await server.post<ChatResponse>('llm/sessions/' + this.sessionId + '/messages', {
                sessionId: this.sessionId,
                content: content,
                options: {
                    useRAG: useRAG
                }
            });

            // Get the assistant's message (last one)
            if (response?.messages?.length) {
                const messages = response.messages;
                const lastMessage = messages[messages.length - 1];

                if (lastMessage && lastMessage.role === 'assistant') {
                    this.addMessageToChat('assistant', lastMessage.content);
                }
            }

            // Display sources if available
            if (response?.sources?.length) {
                this.showSources(response.sources);
            } else {
                this.hideSources();
            }

        } catch (error) {
            console.error('Failed to send message:', error);
            toastService.showError('Failed to send message to AI');
        } finally {
            this.hideLoadingIndicator();
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

        sources.forEach(source => {
            const sourceElement = document.createElement('div');
            sourceElement.className = 'source-item p-1';
            sourceElement.innerHTML = `<a href="#" data-note-id="${source.noteId}" class="source-link">${source.title}</a>`;

            sourceElement.querySelector('.source-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                appContext.tabManager.openTabWithNoteWithHoisting(source.noteId);
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
}
