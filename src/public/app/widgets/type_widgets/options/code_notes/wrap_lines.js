import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("wrap_lines.wrap_lines_in_code_notes")}</h4>
    <label>
        <input type="checkbox" class="line-wrap-enabled form-check-input">
        ${t("wrap_lines.enable_line_wrap")}
    </label>
</div>`;

export default class WrapLinesOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$codeLineWrapEnabled = this.$widget.find(".line-wrap-enabled");
        this.$codeLineWrapEnabled.on('change', () =>
            this.updateCheckboxOption('codeLineWrapEnabled', this.$codeLineWrapEnabled));
    }

    async optionsLoaded(options) {
        this.setCheckboxState(this.$codeLineWrapEnabled, options.codeLineWrapEnabled);
    }
}
