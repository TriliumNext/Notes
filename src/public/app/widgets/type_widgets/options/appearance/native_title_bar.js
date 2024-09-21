import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import utils from "../../../../services/utils.js";

const TPL = `
<div class="options-section">
    <h4>${t("native_title_bar.title")}</h4>
    
    <select class="native-title-bar-select form-control">
        <option value="show">${t("native_title_bar.enabled")}</option>
        <option value="hide">${t("native_title_bar.disabled")}</option>
    </select>
</div>`;

export default class NativeTitleBarOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$nativeTitleBarSelect = this.$widget.find(".native-title-bar-select");
        this.$nativeTitleBarSelect.on('change', () => {
            const nativeTitleBarVisible = this.$nativeTitleBarSelect.val() === 'show' ? 'true' : 'false';

            this.updateOption('nativeTitleBarVisible', nativeTitleBarVisible);
        });
    }
    
    isEnabled() {
        return utils.isElectron();
    }

    async optionsLoaded(options) {
        this.$nativeTitleBarSelect.val(options.nativeTitleBarVisible === 'true' ? 'show' : 'hide');
    }
}
