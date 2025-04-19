import type { OptionMap } from "@triliumnext/commons";
import { t } from "../../../../services/i18n.js";
import OptionsWidget from "../options_widget.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("code_auto_read_only_size.title")}</h4>

    <p class="form-text">${t("code_auto_read_only_size.description")}</p>

    <div class="form-group">
        <label for="auto-readonly-size-code">${t("code_auto_read_only_size.label")}</label>
        <label class="input-group tn-number-unit-pair">
            <input id="auto-readonly-size-code" class="auto-readonly-size-code form-control options-number-input" type="number" min="0">
            <span class="input-group-text">${t("code_auto_read_only_size.unit")}</span>
        </label>
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
