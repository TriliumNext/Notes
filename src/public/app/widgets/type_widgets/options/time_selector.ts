import OptionsWidget from "./options_widget.js";
import toastService from "../../../services/toast.js";
import { t } from "../../../services/i18n.js";
import type { OptionDefinitions, OptionMap } from "../../../../../services/options_interface.js";

type TimeSelectorConstructor = {
    widgetId: string;
    widgetLabelId: string;
    optionValueId: keyof OptionDefinitions;
    optionTimeScaleId: keyof OptionDefinitions;
    includedTimeScales?: Set<TimeSelectorScale>;
};

type TimeSelectorScale = "seconds" | "minutes" | "hours" | "days";

const TPL = (options: Omit<TimeSelectorConstructor, "optionValueId" | "optionTimeScaleId">) => `
    <div class="form-group">
        <label for="${options.widgetId}">${t(options.widgetLabelId)}</label>
        <div class="d-flex gap-2">
            <input id="${options.widgetId}" class="form-control options-number-input" type="number" min="0" steps="1" required>
            <select id="${options.widgetId}-time-scale" class="form-select duration-selector" required>
                ${options.includedTimeScales?.has("seconds") ? `<option value="1">${t("duration.seconds")}</option>` : ""}
                ${options.includedTimeScales?.has("minutes") ? `<option value="60">${t("duration.minutes")}</option>` : ""}
                ${options.includedTimeScales?.has("hours") ? `<option value="3600">${t("duration.hours")}</option>` : ""}
                ${options.includedTimeScales?.has("days") ? `<option value="86400">${t("duration.days")}</option>` : ""}
            </select>
        </div>
    </div>

</div>
<style>
    .duration-selector {
        width: auto;
    }
</style>`;

export default class TimeSelector extends OptionsWidget {
    private $timeValueInput!: JQuery<HTMLInputElement>;
    private $timeScaleSelect!: JQuery<HTMLSelectElement>;
    private internalTimeInSeconds!: string | number;
    private widgetId: string;
    private widgetLabelId: string;
    private optionValueId: keyof OptionDefinitions;
    private optionTimeScaleId: keyof OptionDefinitions;
    private includedTimeScales: Set<TimeSelectorScale>;

    constructor(options: TimeSelectorConstructor) {
        super();
        this.widgetId = options.widgetId;
        this.widgetLabelId = options.widgetLabelId;
        this.optionValueId = options.optionValueId;
        this.optionTimeScaleId = options.optionTimeScaleId;
        this.includedTimeScales = !options.includedTimeScales ? new Set(["seconds", "minutes", "hours", "days"]) : options.includedTimeScales;
    }

    doRender() {
        this.$widget = $(
            TPL({
                widgetId: this.widgetId,
                widgetLabelId: this.widgetLabelId,
                includedTimeScales: this.includedTimeScales
            })
        );

        this.$timeValueInput = this.$widget.find(`#${this.widgetId}`);
        this.$timeScaleSelect = this.$widget.find(`#${this.widgetId}-time-scale`);

        this.$timeValueInput.on("change", () => {
            const time = this.$timeValueInput.val();
            const timeScale = this.$timeScaleSelect.val();

            if (!this.handleTimeValidation() || typeof timeScale !== "string" || !time) return;

            this.internalTimeInSeconds = this.convertTime(time, timeScale).toOption();
            this.updateOption(this.optionValueId, this.internalTimeInSeconds);
        });

        this.$timeScaleSelect.on("change", () => {
            const timeScale = this.$timeScaleSelect.val();

            if (!this.handleTimeValidation() || typeof timeScale !== "string") return;

            //calculate the new displayed value
            const displayedTime = this.convertTime(this.internalTimeInSeconds, timeScale).toDisplay();

            this.updateOption(this.optionTimeScaleId, timeScale);
            this.$timeValueInput.val(displayedTime).trigger("change");
        });
    }

    async optionsLoaded(options: OptionMap) {
        this.internalTimeInSeconds = options[this.optionValueId];
        const displayedTime = this.convertTime(options[this.optionValueId], options[this.optionTimeScaleId]).toDisplay();
        this.$timeValueInput.val(displayedTime);
        this.$timeScaleSelect.val(options[this.optionTimeScaleId]);
    }

    convertTime(time: string | number, timeScale: string | number) {
        const value = typeof time === "number" ? time : parseInt(time);
        if (Number.isNaN(value)) {
            throw new Error(`Time needs to be a valid integer, but received: ${time}`);
        }

        const operand = typeof timeScale === "number" ? timeScale : parseInt(timeScale);
        if (Number.isNaN(operand) || operand < 1) {
            throw new Error(`TimeScale needs to be a valid integer >= 1, but received: ${timeScale}`);
        }

        return {
            toOption: () => Math.ceil(value * operand),
            toDisplay: () => Math.ceil(value / operand)
        };
    }

    handleTimeValidation() {
        if (this.$timeValueInput.is(":invalid")) {
            toastService.showError(t("time_selector.invalid_input"));
            return false;
        }
        return true;
    }
}
