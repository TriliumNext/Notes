import appContext from "../../../../components/app_context.js";
import OptionsWidget from "../options_widget.js";
import utils from "../../../../services/utils.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("zoom_factor.title")}</h4>

    <input type="number" class="zoom-factor-select form-control options-number-input" min="0.3" max="2.0" step="0.1"/>
    <p>${t("zoom_factor.description")}</p>
</div>`;

export default class ZoomFactorOptions extends OptionsWidget {
    isEnabled() {
        return super.isEnabled() && utils.isElectron();
    }

    doRender() {
        this.$widget = $(TPL);
        this.$zoomFactorSelect = this.$widget.find(".zoom-factor-select");
        this.$zoomFactorSelect.on('change', () => { appContext.triggerCommand('setZoomFactorAndSave', {zoomFactor: this.$zoomFactorSelect.val()}); });
    }

    async optionsLoaded(options) {
        this.$zoomFactorSelect.val(options.zoomFactor);
    }
}
