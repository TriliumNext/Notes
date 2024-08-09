import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("text_auto_read_only_size.title")}</h4>

    <p>${t("text_auto_read_only_size.description")}</p>

    <div class="form-group">
        <label>${t("text_auto_read_only_size.label")}</label>
        <input class="auto-readonly-size-text form-control options-number-input" type="number" min="0">
    </div>
</div>`;

export default class TextAutoReadOnlySizeOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$autoReadonlySizeText = this.$widget.find(".auto-readonly-size-text");
        this.$autoReadonlySizeText.on('change', () =>
            this.updateOption('autoReadonlySizeText', this.$autoReadonlySizeText.val()));
    }

    async optionsLoaded(options) {
        this.$autoReadonlySizeText.val(options.autoReadonlySizeText);
    }
}
