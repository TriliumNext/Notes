import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("code-editor-options.title")}</h4>
    <label class="tn-checkbox">
        <input type="checkbox" class="vim-keymap-enabled form-check-input">
        ${t("vim_key_bindings.use_vim_keybindings_in_code_notes")}
    </label>
    <p class="form-text">${t("vim_key_bindings.enable_vim_keybindings")}</p>

    <label class="tn-checkbox">
        <input type="checkbox" class="line-wrap-enabled form-check-input">
        ${t("wrap_lines.wrap_lines_in_code_notes")}
    </label>
    <p class="form-text">${t("wrap_lines.enable_line_wrap")}</p>
</div>`;

export default class CodeEditorOptions extends OptionsWidget {

    private $vimKeymapEnabled!: JQuery<HTMLElement>;
    private $codeLineWrapEnabled!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$vimKeymapEnabled = this.$widget.find(".vim-keymap-enabled");
        this.$vimKeymapEnabled.on("change", () => this.updateCheckboxOption("vimKeymapEnabled", this.$vimKeymapEnabled));

        this.$codeLineWrapEnabled = this.$widget.find(".line-wrap-enabled");
        this.$codeLineWrapEnabled.on("change", () => this.updateCheckboxOption("codeLineWrapEnabled", this.$codeLineWrapEnabled));
    }

    async optionsLoaded(options: OptionMap) {
        this.setCheckboxState(this.$vimKeymapEnabled, options.vimKeymapEnabled);
        this.setCheckboxState(this.$codeLineWrapEnabled, options.codeLineWrapEnabled);
    }
}
