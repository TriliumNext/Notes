import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import utils from "../../../../services/utils.js";
import { getAvailableLocales, t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("i18n.title")}</h4>

    <div class="form-group row">
        <div class="col-6">
            <label for="locale-select">${t("i18n.language")}</label>
            <select id="locale-select" class="locale-select form-select"></select>
        </div>

        <div class="col-6">
            <label id="first-day-of-week-label">${t("i18n.first-day-of-the-week")}</label>
            <div role="group" aria-labelledby="first-day-of-week-label" style="margin-top: .33em;">
                <label class="tn-radio">
                    <input name="first-day-of-week" type="radio" value="0" />
                    ${t("i18n.sunday")}
                </label>

                <label class="tn-radio">
                    <input name="first-day-of-week" type="radio" value="1" />
                    ${t("i18n.monday")}
                </label>
            </div>
        </div>
    </div>
</div>
`;

export default class LocalizationOptions extends OptionsWidget {

    private $localeSelect!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$localeSelect = this.$widget.find(".locale-select");
        this.$localeSelect.on("change", async () => {
            const newLocale = this.$localeSelect.val();
            await server.put(`options/locale/${newLocale}`);
            utils.reloadFrontendApp("locale change");
        });

        this.$widget.find(`input[name="first-day-of-week"]`).on("change", () => {
            const firstDayOfWeek = String(this.$widget.find(`input[name="first-day-of-week"]:checked`).val());
            this.updateOption("firstDayOfWeek", firstDayOfWeek);
        });
    }

    async optionsLoaded(options: OptionMap) {
        const availableLocales = getAvailableLocales().filter(l => !l.contentOnly);
        this.$localeSelect.empty();

        for (const locale of availableLocales) {
            this.$localeSelect.append($("<option>").attr("value", locale.id).text(locale.name));
        }

        this.$localeSelect.val(options.locale);
        this.$widget.find(`input[name="first-day-of-week"][value="${options.firstDayOfWeek}"]`)
                    .prop("checked", "true");
    }
}
