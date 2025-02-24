import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("wrap_lines.wrap_lines_in_code_notes")}</h4>
    <label class="tn-checkbox">
        <input type="checkbox" class="line-wrap-enabled form-check-input">
        ${t("wrap_lines.enable_line_wrap")}
    </label>
</div>`;

export default class WrapLinesOptions extends OptionsWidget {

    private $codeLineWrapEnabled!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$codeLineWrapEnabled = this.$widget.find(".line-wrap-enabled");
        this.$codeLineWrapEnabled.on("change", () => this.updateCheckboxOption("codeLineWrapEnabled", this.$codeLineWrapEnabled));
    }

    async optionsLoaded(options: OptionMap) {
        this.setCheckboxState(this.$codeLineWrapEnabled, options.codeLineWrapEnabled);
    }
}
