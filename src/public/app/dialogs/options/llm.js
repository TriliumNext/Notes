import server from "../../services/server.js";
import utils from "../../services/utils.js";
import options from "../../services/options.js";

const TPL = `
<div>
    <h4>LLM Integration</h4>
    
    <div class="form-group">
        <div class="custom-control custom-switch">
            <input type="checkbox" class="custom-control-input" id="llm-enabled">
            <label class="custom-control-label" for="llm-enabled">Enable LLM Integration</label>
        </div>
        <small class="form-text text-muted">
            When disabled, all LLM features (chat, embeddings, etc.) will be turned off.
        </small>
    </div>

    <div id="llm-settings" style="display: none;">
        <div class="form-group">
            <label>LLM Provider</label>
            <select class="form-control" id="llm-provider">
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Model</label>
            <input type="text" class="form-control" id="llm-model" placeholder="e.g., llama2, gpt-3.5-turbo">
        </div>
        
        <div class="form-group openai-settings" style="display: none;">
            <label>OpenAI API Key</label>
            <input type="password" class="form-control" id="llm-api-key">
            <small class="form-text text-muted">
                Your API key will be stored securely in the database.
            </small>
        </div>
        
        <div class="form-group ollama-settings">
            <label>Ollama Base URL</label>
            <input type="text" class="form-control" id="llm-base-url" placeholder="http://localhost:11434">
            <small class="form-text text-muted">
                URL where your local Ollama instance is running.
            </small>
        </div>
        
        <h5 class="mt-4">Advanced Settings</h5>
        
        <div class="form-group">
            <label>Max Tokens</label>
            <input type="number" class="form-control" id="llm-max-tokens">
            <small class="form-text text-muted">
                Maximum length of generated responses.
            </small>
        </div>
        
        <div class="form-group">
            <label>Temperature</label>
            <input type="number" class="form-control" id="llm-temperature" min="0" max="2" step="0.1">
            <small class="form-text text-muted">
                Controls randomness in responses (0 = deterministic, 2 = very random).
            </small>
        </div>
    </div>
</div>`;

export default class LLMOptions {
    constructor() {
        this.$widget = $(TPL);
        this.$enabled = this.$widget.find('#llm-enabled');
        this.$settings = this.$widget.find('#llm-settings');
        this.$provider = this.$widget.find('#llm-provider');
        this.$model = this.$widget.find('#llm-model');
        this.$apiKey = this.$widget.find('#llm-api-key');
        this.$baseUrl = this.$widget.find('#llm-base-url');
        this.$maxTokens = this.$widget.find('#llm-max-tokens');
        this.$temperature = this.$widget.find('#llm-temperature');
        this.$openaiSettings = this.$widget.find('.openai-settings');
        this.$ollamaSettings = this.$widget.find('.ollama-settings');

        this.$enabled.on('change', () => this.updateVisibility());
        this.$provider.on('change', () => this.updateProviderSettings());
    }

    updateVisibility() {
        const enabled = this.$enabled.prop('checked');
        this.$settings.toggle(enabled);
    }

    updateProviderSettings() {
        const provider = this.$provider.val();
        this.$openaiSettings.toggle(provider === 'openai');
        this.$ollamaSettings.toggle(provider === 'ollama');
    }

    async optionsLoaded(options) {
        this.$enabled.prop('checked', options.is('llmEnabled'));
        this.$provider.val(options.get('llmProvider') || 'ollama');
        this.$model.val(options.get('llmModel') || 'llama2');
        this.$apiKey.val(options.get('llmApiKey') || '');
        this.$baseUrl.val(options.get('llmBaseUrl') || 'http://localhost:11434');
        this.$maxTokens.val(options.getInt('llmMaxTokens') || 2000);
        this.$temperature.val(options.getFloat('llmTemperature') || 0.7);

        this.updateVisibility();
        this.updateProviderSettings();
    }

    async save(options) {
        await options.save('llmEnabled', this.$enabled.prop('checked').toString());
        
        if (options.is('llmEnabled')) {
            await options.save('llmProvider', this.$provider.val());
            await options.save('llmModel', this.$model.val());
            await options.save('llmApiKey', this.$apiKey.val());
            await options.save('llmBaseUrl', this.$baseUrl.val());
            await options.save('llmMaxTokens', this.$maxTokens.val());
            await options.save('llmTemperature', this.$temperature.val());
        }
    }
}
