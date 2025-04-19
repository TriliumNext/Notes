import OptionsWidget from "./options_widget.js";
import toastService from "../../../services/toast.js";
import { t } from "../../../services/i18n.js";
import type { OptionDefinitions, OptionMap } from "@triliumnext/commons";
import optionsService from "../../../services/options.js";

type TimeSelectorConstructor = {
    widgetId: string;
    widgetLabelId: string;
    optionValueId: keyof OptionDefinitions;
    optionTimeScaleId: keyof OptionDefinitions;
    includedTimeScales?: Set<TimeSelectorScale>;
    minimumSeconds?: number;
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
    private minimumSeconds: number;

    constructor(options: TimeSelectorConstructor) {
        super();
        this.widgetId = options.widgetId;
        this.widgetLabelId = options.widgetLabelId;
        this.optionValueId = options.optionValueId;
        this.optionTimeScaleId = options.optionTimeScaleId;
        this.includedTimeScales = options.includedTimeScales || new Set(["seconds", "minutes", "hours", "days"]);
        this.minimumSeconds = options.minimumSeconds || 0;
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

            this.setInternalTimeInSeconds(this.convertTime(time, timeScale).toOption());

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
        const optionValue = optionsService.getInt(this.optionValueId) || 0;
        const optionTimeScale = optionsService.getInt(this.optionTimeScaleId) || 1;

        this.setInternalTimeInSeconds(optionValue);

        const displayedTime = this.convertTime(optionValue, optionTimeScale).toDisplay();
        this.$timeValueInput.val(displayedTime);
        this.$timeScaleSelect.val(optionTimeScale);
    }

    private convertTime(time: string | number, timeScale: string | number) {
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

    private handleTimeValidation() {
        if (this.$timeValueInput.is(":invalid")) {
            toastService.showError(t("time_selector.invalid_input"));
            return false;
        }
        return true;
    }

    private setInternalTimeInSeconds(time: number) {
        if (time < this.minimumSeconds) {
            toastService.showError(t("time_selector.minimum_input", { minimumSeconds: this.minimumSeconds }));
            return (this.internalTimeInSeconds = this.minimumSeconds);
        }
        return (this.internalTimeInSeconds = time);
    }

}
