import OptionsWidget from "../options_widget.js";
import utils from "../../../../services/utils.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("search_engine.title")}</h4>
    
    <p>${t("search_engine.custom_search_engine_info")}</p>
    
    <form class="sync-setup-form">
        <div class="form-group">
            <label>${t("search_engine.predefined_templates_label")}</label>
            <select class="predefined-search-engine-select form-control">
                <option value="Bing">${t("search_engine.bing")}</option>
                <option value="Baidu">${t("search_engine.baidu")}</option>
                <option value="DuckDuckGo">${t("search_engine.duckduckgo")}</option>
                <option value="Google">${t("search_engine.google")}</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>${t("search_engine.custom_name_label")}</label>
            <input type="text" class="custom-search-engine-name form-control" placeholder="${t("search_engine.custom_name_placeholder")}">
        </div>
        
        <div class="form-group">
            <label>${t("search_engine.custom_url_label")}</label>
            <input type="text" class="custom-search-engine-url form-control" placeholder="${t("search_engine.custom_url_placeholder")}">
        </div>
        
        <div style="display: flex; justify-content: space-between;">
            <button class="btn btn-primary">${t("search_engine.save_button")}</button>
        </div>
    </form>
</div>`;

const SEARCH_ENGINES = {
    "Bing": "https://www.bing.com/search?q={keyword}",
    "Baidu": "https://www.baidu.com/s?wd={keyword}",
    "DuckDuckGo": "https://duckduckgo.com/?q={keyword}",
    "Google": "https://www.google.com/search?q={keyword}",
}

export default class SearchEngineOptions extends OptionsWidget {
    isEnabled() {
        return super.isEnabled() && utils.isElectron();
    }

    doRender() {
        this.$widget = $(TPL);

        this.$form = this.$widget.find(".sync-setup-form");
        this.$predefinedSearchEngineSelect = this.$widget.find(".predefined-search-engine-select");
        this.$customSearchEngineName = this.$widget.find(".custom-search-engine-name");
        this.$customSearchEngineUrl = this.$widget.find(".custom-search-engine-url");

        this.$predefinedSearchEngineSelect.on('change', () => {
            const predefinedSearchEngine = this.$predefinedSearchEngineSelect.val();
            this.$customSearchEngineName[0].value = predefinedSearchEngine;
            this.$customSearchEngineUrl[0].value = SEARCH_ENGINES[predefinedSearchEngine];
        });

        this.$form.on('submit', () => {
            this.updateMultipleOptions({
                'customSearchEngineName': this.$customSearchEngineName.val(),
                'customSearchEngineUrl': this.$customSearchEngineUrl.val()
            });
        });
    }

    async optionsLoaded(options) {
        this.$predefinedSearchEngineSelect.val("");
        this.$customSearchEngineName[0].value = options.customSearchEngineName;
        this.$customSearchEngineUrl[0].value = options.customSearchEngineUrl;
    }
}
