import { t } from "../../../../services/i18n.js";
import OptionsWidget from "../options_widget.js";

const TPL = `
<div class="options-section">
    <h4>${t('code_auto_read_only_size.title')}</h4>

    <p>${t('code_auto_read_only_size.description')}</p>

    <div class="form-group">
        <label>${t('code_auto_read_only_size.label')}</label>
        <input class="auto-readonly-size-code form-control options-number-input" type="number" min="0">
    </div>
</div>`;

export default class CodeAutoReadOnlySizeOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$autoReadonlySizeCode = this.$widget.find(".auto-readonly-size-code");
        this.$autoReadonlySizeCode.on('change', () =>
            this.updateOption('autoReadonlySizeCode', this.$autoReadonlySizeCode.val()));
    }

    async optionsLoaded(options) {
        this.$autoReadonlySizeCode.val(options.autoReadonlySizeCode);
    }
}
