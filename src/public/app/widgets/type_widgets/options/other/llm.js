import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t('llm.title')}</h4>
    
    <div class="form-group">
        <label>
            <input class="llm-enabled form-check-input" type="checkbox">
            ${t("llm.enable_integration")}
        </label>
        <h6>
            ${t('llm.enable_description')}
        </h6>
    </div>

    <div class="llm-settings" style="display: none;">
        <div class="form-group">
            <label>${t('llm.provider')}</label>
            <select class="llm-provider form-control">
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>${t('llm.model')}</label>
            <input type="text" class="llm-model form-control" placeholder="e.g., llama2, gpt-3.5-turbo">
        </div>
        
        <div class="form-group openai-settings" style="display: none;">
            <label>${t('llm.api_key')}</label>
            <input type="password" class="llm-api-key form-control">
        </div>
        
        <div class="form-group ollama-settings">
            <label>${t('llm.base_url')}</label>
            <input type="text" class="llm-base-url form-control" placeholder="http://localhost:11434">
        </div>
    </div>
</div>`;

export default class LLMOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        
        this.$enabled = this.$widget.find('.llm-enabled');
        this.$settings = this.$widget.find('.llm-settings');
        this.$provider = this.$widget.find('.llm-provider');
        this.$model = this.$widget.find('.llm-model');
        this.$apiKey = this.$widget.find('.llm-api-key');
        this.$baseUrl = this.$widget.find('.llm-base-url');

        this.$enabled.on('change', () => {
            this.updateCheckboxOption('llmEnabled', this.$enabled);
            this.$settings.toggle(this.$enabled.prop('checked'));
        });

        this.$provider.on('change', () => {
            this.updateOption('llmProvider', this.$provider.val());
            this.updateProviderSettings();
        });

        this.$model.on('change', () => 
            this.updateOption('llmModel', this.$model.val()));
        
        this.$apiKey.on('change', () => 
            this.updateOption('llmApiKey', this.$apiKey.val()));
        
        this.$baseUrl.on('change', () => 
            this.updateOption('llmBaseUrl', this.$baseUrl.val()));

        return this.$widget;
    }

    updateProviderSettings() {
        const provider = this.$provider.val();
        this.$widget.find('.openai-settings').toggle(provider === 'openai');
        this.$widget.find('.ollama-settings').toggle(provider === 'ollama');
    }

    async optionsLoaded(options) {
        this.setCheckboxState(this.$enabled, options.llmEnabled);
        this.$provider.val(options.llmProvider || 'ollama');
        this.$model.val(options.llmModel || 'llama2');
        this.$apiKey.val(options.llmApiKey || '');
        this.$baseUrl.val(options.llmBaseUrl || 'http://localhost:11434');
        
        this.$settings.toggle(options.llmEnabled === 'true');
        this.updateProviderSettings();
    }
}
