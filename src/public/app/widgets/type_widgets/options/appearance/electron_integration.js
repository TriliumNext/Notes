import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import utils from "../../../../services/utils.js";

const TPL = `
<div class="options-section">    
    <h4>${t("electron_integration.desktop-application")}</h4>

    <div class="form-group row">
        <div class="col-12">
            <label for="zoom-factor-select">${t("electron_integration.zoom-factor")}</label>
            <input id="zoom-factor-select" type="number" class="zoom-factor-select form-control options-number-input" min="0.3" max="2.0" step="0.1"/>            
            <p>${t("zoom_factor.description")}</p>
        </div>
    </div>
    <hr />

    <div class="side-checkbox">
        <label class="form-check">
            <input type="checkbox" class="native-title-bar form-check-input" />
            <strong>${t("electron_integration.native-title-bar")}</strong>
            <p>${t("electron_integration.native-title-bar-description")}</p>
        </label>        
    </div>

    <div class="side-checkbox">
        <label class="form-check">
            <input type="checkbox" class="background-effects form-check-input" />
            <strong>${t("electron_integration.background-effects")}</strong>
            <p>${t("electron_integration.background-effects-description")}</p>
        </label>        
    </div>

    <button class="btn btn-micro restart-app-button">${t("electron_integration.restart-app-button")}</button>
</div>
`;

export default class ElectronIntegrationOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$zoomFactorSelect = this.$widget.find(".zoom-factor-select");
        this.$zoomFactorSelect.on('change', () => { appContext.triggerCommand('setZoomFactorAndSave', {zoomFactor: this.$zoomFactorSelect.val()}); });

        this.$nativeTitleBar = this.$widget.find("input.native-title-bar");
        this.$nativeTitleBar.on("change", () => this.updateCheckboxOption("nativeTitleBarVisible", this.$nativeTitleBar));

        this.$backgroundEffects = this.$widget.find("input.background-effects");
        this.$backgroundEffects.on("change", () => this.updateCheckboxOption("backgroundEffects", this.$backgroundEffects));

        const restartAppButton = this.$widget.find(".restart-app-button");
        restartAppButton.on("click", () => {
            const app = utils.dynamicRequire('@electron/remote').app;
            app.relaunch();
            app.exit();
        });
    }
    
    isEnabled() {
        return utils.isElectron();
    }

    async optionsLoaded(options) {
        this.$zoomFactorSelect.val(options.zoomFactor);
        this.setCheckboxState(this.$nativeTitleBar, options.nativeTitleBarVisible);
        this.setCheckboxState(this.$backgroundEffects, options.backgroundEffects);
    }
}
