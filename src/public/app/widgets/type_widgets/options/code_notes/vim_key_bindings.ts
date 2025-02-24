import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("vim_key_bindings.use_vim_keybindings_in_code_notes")}</h4>
    <label class="tn-checkbox">
        <input type="checkbox" class="vim-keymap-enabled form-check-input">
        ${t("vim_key_bindings.enable_vim_keybindings")}
    </label>
</div>`;

export default class VimKeyBindingsOptions extends OptionsWidget {

    private $vimKeymapEnabled!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$vimKeymapEnabled = this.$widget.find(".vim-keymap-enabled");
        this.$vimKeymapEnabled.on("change", () => this.updateCheckboxOption("vimKeymapEnabled", this.$vimKeymapEnabled));
    }

    async optionsLoaded(options: OptionMap) {
        this.setCheckboxState(this.$vimKeymapEnabled, options.vimKeymapEnabled);
    }
}
