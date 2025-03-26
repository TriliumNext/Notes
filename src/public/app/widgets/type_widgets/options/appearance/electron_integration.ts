import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import utils from "../../../../services/utils.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("electron_integration.desktop-application")}</h4>

    <div class="form-group row">
        <div class="col-12">
            <label for="zoom-factor-select">${t("electron_integration.zoom-factor")}</label>
            <input id="zoom-factor-select" type="number" class="zoom-factor-select form-control options-number-input" min="0.3" max="2.0" step="0.1"/>
            <p class="form-text">${t("zoom_factor.description")}</p>
        </div>
    </div>
    <hr />

    <div>
        <label class="form-check tn-checkbox">
            <input type="checkbox" class="native-title-bar form-check-input" />
            ${t("electron_integration.native-title-bar")}
        </label>
        <p class="form-text">
            ${t("electron_integration.native-title-bar-description")}
        </p>
    </div>

    <div>
        <label class="form-check tn-checkbox">
            <input type="checkbox" class="background-effects form-check-input" />
            ${t("electron_integration.background-effects")}
        </label>
        <p class="form-text">
            ${t("electron_integration.background-effects-description")}
        </p>
    </div>

    <button class="btn btn-secondary btn-micro restart-app-button">${t("electron_integration.restart-app-button")}</button>
</div>
`;

export default class ElectronIntegrationOptions extends OptionsWidget {

    private $zoomFactorSelect!: JQuery<HTMLElement>;
    private $nativeTitleBar!: JQuery<HTMLElement>;
    private $backgroundEffects!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$zoomFactorSelect = this.$widget.find(".zoom-factor-select");
        this.$zoomFactorSelect.on("change", () => {
            this.triggerCommand("setZoomFactorAndSave", { zoomFactor: String(this.$zoomFactorSelect.val()) });
        });

        this.$nativeTitleBar = this.$widget.find("input.native-title-bar");
        this.$nativeTitleBar.on("change", () => this.updateCheckboxOption("nativeTitleBarVisible", this.$nativeTitleBar));

        this.$backgroundEffects = this.$widget.find("input.background-effects");
        this.$backgroundEffects.on("change", () => this.updateCheckboxOption("backgroundEffects", this.$backgroundEffects));

        const restartAppButton = this.$widget.find(".restart-app-button");
        restartAppButton.on("click", utils.restartDesktopApp);
    }

    isEnabled() {
        return utils.isElectron();
    }

    async optionsLoaded(options: OptionMap) {
        this.$zoomFactorSelect.val(options.zoomFactor);
        this.setCheckboxState(this.$nativeTitleBar, options.nativeTitleBarVisible);
        this.setCheckboxState(this.$backgroundEffects, options.backgroundEffects);
    }
}
