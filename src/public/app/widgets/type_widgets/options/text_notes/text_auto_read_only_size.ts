import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("text_auto_read_only_size.title")}</h4>

    <p>${t("text_auto_read_only_size.description")}</p>

    <div class="form-group">
        <label for="auto-readonly-size-text">${t("text_auto_read_only_size.label")}</label>
        <input id="auto-readonly-size-text" class="auto-readonly-size-text form-control options-number-input" type="number" min="0">
    </div>
</div>`;

export default class TextAutoReadOnlySizeOptions extends OptionsWidget {

    private $autoReadonlySizeText!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$autoReadonlySizeText = this.$widget.find(".auto-readonly-size-text");
        this.$autoReadonlySizeText.on("change", () => this.updateOption("autoReadonlySizeText", this.$autoReadonlySizeText.val()));
    }

    async optionsLoaded(options: OptionMap) {
        this.$autoReadonlySizeText.val(options.autoReadonlySizeText);
    }
}
