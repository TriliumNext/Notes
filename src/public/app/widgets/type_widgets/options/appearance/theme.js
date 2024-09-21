import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import utils from "../../../../services/utils.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("theme.title")}</h4>
    
    <div class="form-group row">
        <div class="col-6">
            <label>${t("theme.theme_label")}</label>
            <select class="theme-select form-select"></select>
        </div>
        
        <div class="col-6">
            <label>${t("theme.override_theme_fonts_label")}</label>
            <div class="form-check">
                <input type="checkbox" class="override-theme-fonts form-check-input">
            </div>
        </div>
    </div>
</div>`;

export default class ThemeOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$themeSelect = this.$widget.find(".theme-select");
        this.$overrideThemeFonts = this.$widget.find(".override-theme-fonts");

        this.$themeSelect.on('change', async () => {
            const newTheme = this.$themeSelect.val();

            await server.put(`options/theme/${newTheme}`);

            utils.reloadFrontendApp("theme change");
        });

        this.$overrideThemeFonts.on('change', () => this.updateCheckboxOption('overrideThemeFonts', this.$overrideThemeFonts));
    }

    async optionsLoaded(options) {
        const themes = [
            { val: 'light', title: t('theme.light_theme') },
            { val: 'dark', title: t('theme.dark_theme') }
        ].concat(await server.get('options/user-themes'));

        this.$themeSelect.empty();

        for (const theme of themes) {
            this.$themeSelect.append($("<option>")
                .attr("value", theme.val)
                .attr("data-note-id", theme.noteId)
                .text(theme.title));
        }

        this.$themeSelect.val(options.theme);

        this.setCheckboxState(this.$overrideThemeFonts, options.overrideThemeFonts);
    }
}
