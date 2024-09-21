import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("highlights_list.title")}</h4>

    <p>${t("highlights_list.description")}</p>

    </div>
        <label><input type="checkbox" class="highlights-list-check form-check-input" value="bold"> ${t("highlights_list.bold")} &nbsp;</label>
        <label><input type="checkbox" class="highlights-list-check form-check-input" value="italic"> ${t("highlights_list.italic")} &nbsp;</label>
        <label><input type="checkbox" class="highlights-list-check form-check-input" value="underline"> ${t("highlights_list.underline")} &nbsp;</label>
        <label><input type="checkbox" class="highlights-list-check form-check-input" value="color"> ${t("highlights_list.color")} &nbsp;</label>
        <label><input type="checkbox" class="highlights-list-check form-check-input" value="bgColor"> ${t("highlights_list.bg_color")} &nbsp;</label>
    </div>

    <br/><br/>
    <h5>${t("highlights_list.visibility_title")}</h5>

    <p>${t("highlights_list.visibility_description")}</p>
    
    <p>${t("highlights_list.shortcut_info")}</p>
</div>`;

export default class HighlightsListOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$hlt = this.$widget.find("input.highlights-list-check");
        this.$hlt.on('change', () => {
            const hltVals = this.$widget.find('input.highlights-list-check[type="checkbox"]:checked').map(function () {
                return this.value;
            }).get();
            this.updateOption('highlightsList', JSON.stringify(hltVals));
        });
    }

    async optionsLoaded(options) {
        const hltVals = JSON.parse(options.highlightsList);
        this.$widget.find('input.highlights-list-check[type="checkbox"]').each(function () {
            if ($.inArray($(this).val(), hltVals) !== -1) {
                $(this).prop("checked", true);
            } else {
                $(this).prop("checked", false);
            }
        });
    }
}
