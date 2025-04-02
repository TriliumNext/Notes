import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("network_connections.network_connections_title")}</h4>

    <label class="tn-checkbox">
        <input class="check-for-updates form-check-input" type="checkbox" name="check-for-updates">
        ${t("network_connections.check_for_updates")}
    </label>
</div>`;

export default class NetworkConnectionsOptions extends OptionsWidget {

    private $checkForUpdates!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$checkForUpdates = this.$widget.find(".check-for-updates");
        this.$checkForUpdates.on("change", () => this.updateCheckboxOption("checkForUpdates", this.$checkForUpdates));
    }

    async optionsLoaded(options: OptionMap) {
        this.setCheckboxState(this.$checkForUpdates, options.checkForUpdates);
    }
}
