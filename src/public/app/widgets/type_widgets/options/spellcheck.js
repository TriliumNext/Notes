import utils from "../../../services/utils.js";
import OptionsWidget from "./options_widget.js";
import { t } from "../../../services/i18n.js";

const TPL_WEB = `
<div class="options-section">
    <h4>${t('spellcheck.title')}</h4>

    <p>${t('spellcheck.description')}</p>
</div>
`;

const TPL_ELECTRON = `
<div class="options-section">
    <h4>${t('spellcheck.title')}</h4>

    <p>${t("spellcheck.restart-required")}</p>

    <label>
        <input type="checkbox" class="spell-check-enabled">
        ${t('spellcheck.enable')}
    </label>

    <br/>

    <div class="form-group">
        <label>${t('spellcheck.language_code_label')}</label>
        <input type="text" class="spell-check-language-code form-control" placeholder="${t('spellcheck.language_code_placeholder')}">
    </div>

    <p>${t('spellcheck.multiple_languages_info')}</p>
    
    <p><strong>${t('spellcheck.available_language_codes_label')} </strong> <span class="available-language-codes"></span></p>
</div>`;

export default class SpellcheckOptions extends OptionsWidget {
    doRender() {
        const template = utils.isElectron() ? TPL_ELECTRON : TPL_WEB;
        this.$widget = $(template);

        this.$spellCheckEnabled = this.$widget.find(".spell-check-enabled");
        this.$spellCheckLanguageCode = this.$widget.find(".spell-check-language-code");

        this.$spellCheckEnabled.on('change', () =>
            this.updateCheckboxOption('spellCheckEnabled', this.$spellCheckEnabled));

        this.$spellCheckLanguageCode.on('change', () =>
            this.updateOption('spellCheckLanguageCode', this.$spellCheckLanguageCode.val()));

        this.$availableLanguageCodes = this.$widget.find(".available-language-codes");

        if (utils.isElectron()) {
            const { webContents } = utils.dynamicRequire('@electron/remote').getCurrentWindow();

            this.$availableLanguageCodes.text(webContents.session.availableSpellCheckerLanguages.join(', '));
        }
    }

    optionsLoaded(options) {
        this.setCheckboxState(this.$spellCheckEnabled, options.spellCheckEnabled);
        this.$spellCheckLanguageCode.val(options.spellCheckLanguageCode);
    }
}
