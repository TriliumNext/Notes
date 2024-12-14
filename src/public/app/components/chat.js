import server from '../services/server.js';
import utils from '../services/utils.js';
import toastService from '../services/toast.js';

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
            margin-left: 20px;
        }
        
        .chat-message.assistant {
            background-color: var(--more-accented-background-color);
            margin-right: 20px;
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
            color: var(--main-text-color);
        }
        
        .chat-send-button {
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            background-color: var(--button-background-color);
            color: var(--button-text-color);
            cursor: pointer;
        }
        
        .chat-send-button:hover {
            background-color: var(--button-background-color-hover);
        }
    </style>

    <div class="chat-messages"></div>
    
    <div class="chat-input-container">
        <textarea class="chat-input" placeholder="Type your message..." rows="3"></textarea>
        <button class="chat-send-button">Send</button>
    </div>
</div>`;

export default class ChatWidget extends HTMLElement {
    constructor() {
        super();
        this.messages = [];
    }

    connectedCallback() {
        this.innerHTML = TPL;
        
        this.$chatMessages = this.querySelector('.chat-messages');
        this.$chatInput = this.querySelector('.chat-input');
        this.$sendButton = this.querySelector('.chat-send-button');
        
        this.$chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.$sendButton.addEventListener('click', () => this.sendMessage());
    }
    
    async sendMessage() {
        const content = this.$chatInput.value.trim();
        if (!content) {
            return;
        }
        
        this.$chatInput.value = '';
        this.addMessage('user', content);
        
        try {
            const response = await server.post('llm/chat', {
                messages: this.messages,
                context: {
                    noteIds: [utils.getCurrentNoteId()]
                }
            });
            
            this.addMessage('assistant', response.content);
        } catch (e) {
            toastService.showError('Error sending message: ' + e.message);
        }
    }
    
    addMessage(role, content) {
        this.messages.push({ role, content });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.innerHTML = role === 'assistant' 
            ? utils.formatMarkdown(content)
            : utils.escapeHtml(content);
        
        this.$chatMessages.appendChild(messageDiv);
        this.$chatMessages.scrollTop = this.$chatMessages.scrollHeight;
    }
}

customElements.define('chat-widget', ChatWidget);
