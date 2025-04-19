import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import utils from "../../../../services/utils.js";
import type { OptionMap } from "@triliumnext/commons";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("tray.title")}</h4>

    <label class="tn-checkbox">
        <input type="checkbox" class="tray-enabled">
        ${t("tray.enable_tray")}
    </label>
</div>`;

export default class TrayOptions extends OptionsWidget {

    private $trayEnabled!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$trayEnabled = this.$widget.find(".tray-enabled");
        this.$trayEnabled.on("change", () => this.updateOption("disableTray", !this.$trayEnabled.is(":checked") ? "true" : "false"));
    }

    isEnabled() {
        return utils.isElectron();
    }

    async optionsLoaded(options: OptionMap) {
        this.$trayEnabled.prop("checked", options.disableTray !== "true");
    }
}
