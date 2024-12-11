import BasicWidget from "./basic_widget.js";
import utils from "../services/utils.js";
import server from "../services/server.js";

const TPL = `
<div class="chat-widget">
    <style>
        .chat-widget {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 10px;
        }
        
        .chat-messages {
            flex-grow: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid var(--main-border-color);
            border-radius: 5px;
        }
        
        .chat-message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 5px;
        }
        
        .chat-message.user {
            background-color: var(--accented-background-color);
            margin-left: 20%;
        }
        
        .chat-message.assistant {
            background-color: var(--more-accented-background-color);
            margin-right: 20%;
        }
        
        .chat-input-container {
            display: flex;
            gap: 10px;
        }
        
        .chat-input {
            flex-grow: 1;
            padding: 8px;
            border: 1px solid var(--main-border-color);
            border-radius: 5px;
            background-color: var(--accented-background-color);
        }
        
        .chat-send-button {
            padding: 8px 16px;
            background-color: var(--button-background-color);
            border: none;
            border-radius: 5px;
            color: var(--button-text-color);
            cursor: pointer;
        }
        
        .chat-send-button:hover {
            background-color: var(--button-background-color-hover);
        }

        .chat-disabled-message {
            text-align: center;
            padding: 20px;
            color: var(--muted-text-color);
        }
    </style>
    
    <div class="chat-messages"></div>
    
    <div class="chat-input-container">
        <textarea class="chat-input" placeholder="Type your message..."></textarea>
        <button class="chat-send-button">Send</button>
    </div>
</div>`;

const DISABLED_MESSAGE = `
<div class="chat-disabled-message">
    <h4>LLM Integration is Disabled</h4>
    <p>To enable chat functionality, go to Options → LLM Integration and enable the feature.</p>
</div>`;

export default class ChatWidget extends BasicWidget {
    constructor() {
        super();

        this.messages = [];
        this.enabled = true;
    }

    async doRender() {
        this.$widget = $(TPL);
        this.$messages = this.$widget.find('.chat-messages');
        this.$input = this.$widget.find('.chat-input');
        this.$sendButton = this.$widget.find('.chat-send-button');
        this.$inputContainer = this.$widget.find('.chat-input-container');

        this.$sendButton.on('click', () => this.sendMessage());
        this.$input.on('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        await this.checkEnabled();

        return this.$widget;
    }

    async checkEnabled() {
        try {
            const config = await server.get('llm/config');
            this.enabled = config.enabled !== false;
            
            if (!this.enabled) {
                this.$messages.html(DISABLED_MESSAGE);
                this.$inputContainer.hide();
            } else {
                this.$messages.empty();
                this.$inputContainer.show();
            }
        } catch (error) {
            console.error('Error checking LLM status:', error);
            this.enabled = false;
            this.$messages.html(DISABLED_MESSAGE);
            this.$inputContainer.hide();
        }
    }

    async sendMessage() {
        if (!this.enabled) return;

        const content = this.$input.val().trim();
        if (!content) return;

        this.$input.val('');
        this.addMessage('user', content);

        try {
            const noteContext = await this.getNoteContext();
            const response = await server.post('llm/chat', {
                messages: [...this.messages],
                context: noteContext
            });

            this.addMessage('assistant', response.response);
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessage('assistant', 'Sorry, there was an error processing your request.');
        }
    }

    async getNoteContext() {
        const activeNoteId = this.noteId;
        if (!activeNoteId) return null;

        return {
            noteIds: [activeNoteId],
            maxResults: 1
        };
    }

    addMessage(role, content) {
        this.messages.push({ role, content });

        const $message = $('<div>')
            .addClass('chat-message')
            .addClass(role)
            .text(content);

        this.$messages.append($message);
        this.$messages.scrollTop(this.$messages[0].scrollHeight);
    }

    async refresh() {
        this.messages = [];
        await this.checkEnabled();
    }
}
