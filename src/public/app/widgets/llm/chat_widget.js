import TabAwareWidget from "../tab_aware_widget.js";
import chatService from "../../../../services/llm/chat_service.js";
import options from "../../services/options.js";
import utils from "../../services/utils.js";

const TPL = `
<div class="chat-widget">
    <div class="chat-header">
        <div class="chat-title"></div>
        <div class="chat-actions">
            <button class="btn btn-sm chat-new-btn" title="New Chat">
                <span class="bx bx-plus"></span>
            </button>
            <button class="btn btn-sm chat-options-btn" title="Chat Options">
                <span class="bx bx-cog"></span>
            </button>
        </div>
    </div>
    <div class="chat-messages"></div>
    <div class="chat-controls">
        <div class="chat-input-container">
            <textarea class="chat-input form-control" placeholder="Type your message here..." rows="2"></textarea>
        </div>
        <div class="chat-buttons">
            <button class="btn btn-primary btn-sm chat-send-btn" title="Send Message">
                <span class="bx bx-send"></span>
            </button>
            <button class="btn btn-outline-secondary btn-sm chat-add-context-btn" title="Add current note as context">
                <span class="bx bx-link"></span>
            </button>
        </div>
    </div>
</div>
`;

const MESSAGE_TPL = `
<div class="chat-message">
    <div class="chat-message-avatar">
        <span class="bx"></span>
    </div>
    <div class="chat-message-content"></div>
</div>
`;

export default class ChatWidget extends TabAwareWidget {
    constructor() {
        super();

        this.activeSessionId = null;
        this.$widget = $(TPL);
        this.$title = this.$widget.find('.chat-title');
        this.$messagesContainer = this.$widget.find('.chat-messages');
        this.$input = this.$widget.find('.chat-input');
        this.$sendBtn = this.$widget.find('.chat-send-btn');
        this.$newChatBtn = this.$widget.find('.chat-new-btn');
        this.$optionsBtn = this.$widget.find('.chat-options-btn');
        this.$addContextBtn = this.$widget.find('.chat-add-context-btn');

        this.initialized = false;
        this.isActiveTab = false;
    }

    isEnabled() {
        return options.getOptionBool('llmEnabled');
    }

    doRender() {
        this.$widget.on('click', '.chat-send-btn', async () => {
            if (!this.activeSessionId) return;

            const message = this.$input.val().trim();
            if (!message) return;

            this.$input.val('');
            this.$input.prop('disabled', true);
            this.$sendBtn.prop('disabled', true);

            await this.sendMessage(message);

            this.$input.prop('disabled', false);
            this.$sendBtn.prop('disabled', false);
            this.$input.focus();
        });

        this.$input.on('keydown', async e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.$sendBtn.click();
            }
        });

        this.$newChatBtn.on('click', async () => {
            await this.startNewChat();
        });

        this.$addContextBtn.on('click', async () => {
            if (!this.activeSessionId || !this.noteId) return;

            this.$input.prop('disabled', true);
            this.$sendBtn.prop('disabled', true);
            this.$addContextBtn.prop('disabled', true);

            await this.addNoteContext();

            this.$input.prop('disabled', false);
            this.$sendBtn.prop('disabled', false);
            this.$addContextBtn.prop('disabled', false);
        });

        this.$optionsBtn.on('click', () => {
            this.triggerEvent('openOptions');
        });

        return this.$widget;
    }

    async refresh() {
        if (!this.isEnabled()) {
            this.toggleVisibility(false);
            return;
        }

        this.toggleVisibility(true);

        if (!this.initialized) {
            await this.initialize();
        }

        if (this.activeSessionId) {
            await this.loadSession(this.activeSessionId);
        } else {
            await this.startNewChat();
        }
    }

    toggleVisibility(show) {
        this.$widget.toggleClass('d-none', !show);
    }

    async initialize() {
        // Load last or create new chat session
        const sessions = await chatService.getAllSessions();

        if (sessions.length > 0) {
            // Use the most recent session
            this.activeSessionId = sessions[0].id;
            await this.loadSession(this.activeSessionId);
        } else {
            await this.startNewChat();
        }

        this.initialized = true;
    }

    async loadSession(sessionId) {
        try {
            const session = await chatService.getOrCreateSession(sessionId);
            this.activeSessionId = session.id;

            // Update title
            this.$title.text(session.title || 'New Chat');

            // Clear and reload messages
            this.$messagesContainer.empty();

            for (const message of session.messages) {
                this.addMessageToUI(message);
            }

            // Scroll to bottom
            this.scrollToBottom();

        } catch (error) {
            console.error('Failed to load chat session:', error);
            await this.startNewChat();
        }
    }

    async startNewChat() {
        try {
            const session = await chatService.createSession();
            this.activeSessionId = session.id;

            // Update title
            this.$title.text(session.title || 'New Chat');

            // Clear messages
            this.$messagesContainer.empty();

            // Add welcome message
            const welcomeMessage = {
                role: 'assistant',
                content: 'Hello! How can I assist you today?'
            };

            this.addMessageToUI(welcomeMessage);

            // Focus input
            this.$input.focus();

        } catch (error) {
            console.error('Failed to create new chat session:', error);
        }
    }

    async sendMessage(content) {
        if (!this.activeSessionId) return;

        // Add user message to UI immediately
        const userMessage = { role: 'user', content };
        this.addMessageToUI(userMessage);

        // Prepare for streaming response
        const $assistantMessage = this.createEmptyAssistantMessage();

        // Send to service with streaming callback
        try {
            await chatService.sendMessage(
                this.activeSessionId,
                content,
                null,
                (content, isDone) => {
                    // Update the message content as it streams
                    $assistantMessage.find('.chat-message-content').html(this.formatMessageContent(content));
                    this.scrollToBottom();

                    if (isDone) {
                        // Update session title if it changed
                        chatService.getOrCreateSession(this.activeSessionId).then(session => {
                            this.$title.text(session.title);
                        });
                    }
                }
            );
        } catch (error) {
            console.error('Error sending message:', error);

            // Show error in UI if not already shown by streaming
            $assistantMessage.find('.chat-message-content').html(
                this.formatMessageContent(`Error: Failed to generate response. ${error.message || 'Please check AI settings and try again.'}`)
            );
        }

        this.scrollToBottom();
    }

    async addNoteContext() {
        if (!this.activeSessionId || !this.noteId) return;

        try {
            // Show loading message
            const $loadingMessage = this.createEmptyAssistantMessage();
            $loadingMessage.find('.chat-message-content').html('Loading note context...');

            await chatService.addNoteContext(this.activeSessionId, this.noteId);

            // Remove loading message
            $loadingMessage.remove();

            // Reload the session to show updated messages
            await this.loadSession(this.activeSessionId);

        } catch (error) {
            console.error('Error adding note context:', error);
        }
    }

    addMessageToUI(message) {
        const $message = $(MESSAGE_TPL);

        // Set avatar icon based on role
        if (message.role === 'user') {
            $message.addClass('chat-message-user');
            $message.find('.chat-message-avatar .bx').addClass('bx-user');
        } else {
            $message.addClass('chat-message-assistant');
            $message.find('.chat-message-avatar .bx').addClass('bx-bot');
        }

        // Set content
        $message.find('.chat-message-content').html(this.formatMessageContent(message.content));

        // Add to container
        this.$messagesContainer.append($message);

        // Scroll to bottom
        this.scrollToBottom();

        return $message;
    }

    createEmptyAssistantMessage() {
        const $message = $(MESSAGE_TPL);
        $message.addClass('chat-message-assistant');
        $message.find('.chat-message-avatar .bx').addClass('bx-bot');
        $message.find('.chat-message-content').html('<div class="chat-loading">●●●</div>');

        this.$messagesContainer.append($message);
        this.scrollToBottom();

        return $message;
    }

    formatMessageContent(content) {
        if (!content) return '';

        // Escape HTML
        let formatted = utils.escapeHtml(content);

        // Convert markdown-style code blocks to HTML
        formatted = formatted.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, language, code) => {
            return `<pre class="code${language ? ' language-' + language : ''}"><code>${utils.escapeHtml(code)}</code></pre>`;
        });

        // Convert inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    scrollToBottom() {
        this.$messagesContainer.scrollTop(this.$messagesContainer[0].scrollHeight);
    }

    /**
     * @param {string} noteId
     */
    async noteSwitched(noteId) {
        this.noteId = noteId;

        if (this.isActiveTab) {
            // Only refresh if we're the active tab
            await this.refresh();
        }
    }

    /**
     * @param {boolean} active
     */
    activeTabChanged(active) {
        this.isActiveTab = active;

        if (active) {
            this.refresh();
        }
    }

    entitiesReloaded() {
        if (this.isActiveTab) {
            this.refresh();
        }
    }
}
