import type { OptionMap } from "../../../../../../services/options_interface.js";
import { t } from "../../../../services/i18n.js";
import OptionsWidget from "../options_widget.js";

const TPL = `
<div class="options-section">
    <h4>${t("code_auto_read_only_size.title")}</h4>

    <p>${t("code_auto_read_only_size.description")}</p>

    <div class="form-group">
        <label for="auto-readonly-size-code">${t("code_auto_read_only_size.label")}</label>
        <input id="auto-readonly-size-code" class="auto-readonly-size-code form-control options-number-input" type="number" min="0">
    </div>
</div>`;

export default class CodeAutoReadOnlySizeOptions extends OptionsWidget {

    private $autoReadonlySizeCode!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$autoReadonlySizeCode = this.$widget.find(".auto-readonly-size-code");
        this.$autoReadonlySizeCode.on("change", () => this.updateOption("autoReadonlySizeCode", this.$autoReadonlySizeCode.val()));
    }

    async optionsLoaded(options: OptionMap) {
        this.$autoReadonlySizeCode.val(options.autoReadonlySizeCode);
    }
}
