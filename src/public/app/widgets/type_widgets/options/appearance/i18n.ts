import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import utils from "../../../../services/utils.js";
import { t } from "../../../../services/i18n.js";
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
            <label for="first-day-of-week-select">${t("i18n.first-day-of-the-week")}</label>
            <select id="first-day-of-week-select" class="first-day-of-week-select form-select">
                <option value="0">${t("i18n.sunday")}</option>
                <option value="1">${t("i18n.monday")}</option>
            </select>
        </div>
    </div>
</div>
`;

// TODO: Deduplicate with server.
interface Locale {
    id: string;
    name: string;
}

export default class LocalizationOptions extends OptionsWidget {

    private $localeSelect!: JQuery<HTMLElement>;
    private $firstDayOfWeek!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$localeSelect = this.$widget.find(".locale-select");
        this.$localeSelect.on("change", async () => {
            const newLocale = this.$localeSelect.val();
            await server.put(`options/locale/${newLocale}`);
            utils.reloadFrontendApp("locale change");
        });

        this.$firstDayOfWeek = this.$widget.find(".first-day-of-week-select");
        this.$firstDayOfWeek.on("change", () => {
            this.updateOption("firstDayOfWeek", String(this.$firstDayOfWeek.val()));
        });
    }

    async optionsLoaded(options: OptionMap) {
        const availableLocales = await server.get<Locale[]>("options/locales");
        this.$localeSelect.empty();

        for (const locale of availableLocales) {
            this.$localeSelect.append($("<option>").attr("value", locale.id).text(locale.name));
        }

        this.$localeSelect.val(options.locale);
        this.$firstDayOfWeek.val(options.firstDayOfWeek);
    }
}
