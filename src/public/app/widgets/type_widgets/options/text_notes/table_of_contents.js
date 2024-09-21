import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("table_of_contents.title")}</h4>
    
    ${t("table_of_contents.description")}
    
    <div class="form-group">
        <input type="number" class="min-toc-headings form-control options-number-input options-number-input" min="0" max="9999999999999999" step="1" />
    </div>
    
    <p>${t("table_of_contents.disable_info")}</p>
    
    <p>${t("table_of_contents.shortcut_info")}</p>
</div>`;

export default class TableOfContentsOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$minTocHeadings = this.$widget.find(".min-toc-headings");
        this.$minTocHeadings.on('change', () =>
            this.updateOption('minTocHeadings', this.$minTocHeadings.val()));
    }

    async optionsLoaded(options) {
        this.$minTocHeadings.val(options.minTocHeadings);
    }
}
