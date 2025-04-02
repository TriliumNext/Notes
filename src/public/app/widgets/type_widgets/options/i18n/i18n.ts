import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import utils from "../../../../services/utils.js";
import { getAvailableLocales, t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";
import type { Locale } from "../../../../../../services/i18n.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("i18n.title")}</h4>

    <div class="locale-options-container">
        <div class="option-row">
            <label for="locale-select">${t("i18n.language")}</label>
            <select id="locale-select" class="locale-select form-select"></select>
        </div>

        <div class="option-row electron-only">
            <label for="formatting-locale-select">${t("i18n.formatting-locale")}</label>
            <select id="formatting-locale-select" class="formatting-locale-select form-select"></select>
        </div>

        <div class="option-row">
            <label id="first-day-of-week-label">${t("i18n.first-day-of-the-week")}</label>
            <div role="group" aria-labelledby="first-day-of-week-label">
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

        <div class="option-row centered">
            <button class="btn btn-secondary btn-micro restart-app-button">${t("electron_integration.restart-app-button")}</button>
        </div>
    </div>

    <style>
        .locale-options-container .option-row {
            border-bottom: 1px solid var(--main-border-color);
            display: flex;
            align-items: center;
            padding: 0.5em 0;
        }

        .locale-options-container .option-row > label {
            width: 40%;
            margin-bottom: 0 !important;
        }

        .locale-options-container .option-row > select {
            width: 60%;
        }

        .locale-options-container .option-row:last-of-type {
            border-bottom: unset;
        }

        .locale-options-container .option-row.centered {
            justify-content: center;
        }
    </style>
</div>
`;

export default class LocalizationOptions extends OptionsWidget {

    private $localeSelect!: JQuery<HTMLElement>;
    private $formattingLocaleSelect!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$localeSelect = this.$widget.find(".locale-select");
        this.$localeSelect.on("change", async () => {
            const newLocale = this.$localeSelect.val();
            await server.put(`options/locale/${newLocale}`);
        });

        this.$formattingLocaleSelect = this.$widget.find(".formatting-locale-select");
        this.$formattingLocaleSelect.on("change", async () => {
            const newLocale = this.$formattingLocaleSelect.val();
            await server.put(`options/formattingLocale/${newLocale}`);
        });

        this.$widget.find(`input[name="first-day-of-week"]`).on("change", () => {
            const firstDayOfWeek = String(this.$widget.find(`input[name="first-day-of-week"]:checked`).val());
            this.updateOption("firstDayOfWeek", firstDayOfWeek);
        });
        this.$widget.find(".restart-app-button").on("click", utils.restartDesktopApp);
    }

    async optionsLoaded(options: OptionMap) {
        const allLocales = getAvailableLocales();

        function buildLocaleItem(locale: Locale, value: string) {
            return $("<option>")
                .attr("value", value)
                .text(locale.name)
        }

        // Build list of UI locales.
        this.$localeSelect.empty();
        for (const locale of allLocales.filter(l => !l.contentOnly)) {
            this.$localeSelect.append(buildLocaleItem(locale, locale.id));
        }
        this.$localeSelect.val(options.locale);

        // Build list of Electron locales.
        this.$formattingLocaleSelect.empty();
        for (const locale of allLocales.filter(l => l.electronLocale)) {
            this.$formattingLocaleSelect.append(buildLocaleItem(locale, locale.electronLocale as string));
        }
        this.$formattingLocaleSelect.val(options.formattingLocale);

        this.$widget.find(`input[name="first-day-of-week"][value="${options.firstDayOfWeek}"]`)
                    .prop("checked", "true");
    }
}
