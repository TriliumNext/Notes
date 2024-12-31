import server from "../services/server.js";
import utils from "../services/utils.js";

const TPL = `
<div class="llm-settings-dialog modal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">LLM Settings</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form>
                    <div class="form-group">
                        <label for="llm-provider">LLM Provider</label>
                        <select class="form-control" id="llm-provider">
                            <option value="ollama">Ollama</option>
                            <option value="openai">OpenAI</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="llm-model">Model</label>
                        <input type="text" class="form-control" id="llm-model" placeholder="e.g., llama2, gpt-3.5-turbo">
                    </div>
                    
                    <div class="form-group">
                        <label for="llm-api-key">API Key (for OpenAI)</label>
                        <input type="password" class="form-control" id="llm-api-key">
                    </div>
                    
                    <div class="form-group">
                        <label for="llm-base-url">Base URL (for Ollama)</label>
                        <input type="text" class="form-control" id="llm-base-url" placeholder="http://localhost:11434">
                    </div>
                    
                    <div class="form-group">
                        <label for="llm-max-tokens">Max Tokens</label>
                        <input type="number" class="form-control" id="llm-max-tokens">
                    </div>
                    
                    <div class="form-group">
                        <label for="llm-temperature">Temperature</label>
                        <input type="number" class="form-control" id="llm-temperature" min="0" max="2" step="0.1">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" id="save-llm-settings">Save changes</button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>`;

export default class LLMSettingsDialog {
    constructor() {
        this.$dialog = $(TPL);
        this.$provider = this.$dialog.find('#llm-provider');
        this.$model = this.$dialog.find('#llm-model');
        this.$apiKey = this.$dialog.find('#llm-api-key');
        this.$baseUrl = this.$dialog.find('#llm-base-url');
        this.$maxTokens = this.$dialog.find('#llm-max-tokens');
        this.$temperature = this.$dialog.find('#llm-temperature');
        this.$saveButton = this.$dialog.find('#save-llm-settings');

        this.$provider.on('change', () => this.updateVisibility());
        this.$saveButton.on('click', () => this.save());

        this.loadSettings();
    }

    async loadSettings() {
        const config = await server.get('llm/config');
        
        this.$provider.val(config.provider);
        this.$model.val(config.model);
        this.$apiKey.val(config.apiKey);
        this.$baseUrl.val(config.baseUrl);
        this.$maxTokens.val(config.maxTokens);
        this.$temperature.val(config.temperature);

        this.updateVisibility();
    }

    updateVisibility() {
        const provider = this.$provider.val();
        
        if (provider === 'openai') {
            this.$apiKey.closest('.form-group').show();
            this.$baseUrl.closest('.form-group').hide();
        } else {
            this.$apiKey.closest('.form-group').hide();
            this.$baseUrl.closest('.form-group').show();
        }
    }

    async save() {
        const config = {
            provider: this.$provider.val(),
            model: this.$model.val(),
            apiKey: this.$apiKey.val(),
            baseUrl: this.$baseUrl.val(),
            maxTokens: parseInt(this.$maxTokens.val()),
            temperature: parseFloat(this.$temperature.val())
        };

        await server.put('llm/config', config);
        this.$dialog.modal('hide');
    }

    show() {
        this.loadSettings();
        this.$dialog.modal();
    }
}
