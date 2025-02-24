import OptionsWidget from "../options_widget.js";
import utils from "../../../../services/utils.js";
import { t } from "../../../../services/i18n.js";
import type { FontFamily, OptionMap, OptionNames } from "../../../../../../services/options_interface.js";

interface FontFamilyEntry {
    value: FontFamily;
    label?: string;
}

interface FontGroup {
    title: string;
    items: FontFamilyEntry[];
}

const FONT_FAMILIES: FontGroup[] = [
    {
        title: t("fonts.generic-fonts"),
        items: [
            { value: "theme", label: t("fonts.theme_defined") },
            { value: "system", label: t("fonts.system-default") },
            { value: "serif", label: t("fonts.serif") },
            { value: "sans-serif", label: t("fonts.sans-serif") },
            { value: "monospace", label: t("fonts.monospace") }
        ]
    },
    {
        title: t("fonts.sans-serif-system-fonts"),
        items: [{ value: "Arial" }, { value: "Verdana" }, { value: "Helvetica" }, { value: "Tahoma" }, { value: "Trebuchet MS" }, { value: "Microsoft YaHei" }]
    },
    {
        title: t("fonts.serif-system-fonts"),
        items: [{ value: "Times New Roman" }, { value: "Georgia" }, { value: "Garamond" }]
    },
    {
        title: t("fonts.monospace-system-fonts"),
        items: [
            { value: "Courier New" },
            { value: "Brush Script MT" },
            { value: "Impact" },
            { value: "American Typewriter" },
            { value: "Andalé Mono" },
            { value: "Lucida Console" },
            { value: "Monaco" }
        ]
    },
    {
        title: t("fonts.handwriting-system-fonts"),
        items: [{ value: "Bradley Hand" }, { value: "Luminari" }, { value: "Comic Sans MS" }]
    }
];

const TPL = `
<div class="options-section">
    <h4>${t("fonts.fonts")}</h4>

    <h5>${t("fonts.main_font")}</h5>

    <div class="form-group row">
        <div class="col-6">
            <label for="main-font-family">${t("fonts.font_family")}</label>
            <select id="main-font-family" class="main-font-family form-select"></select>
        </div>

        <div class="col-6">
            <label for="main-font-size">${t("fonts.size")}</label>

            <div class="input-group main-font-size-input-group">
                <input id="main-font-size" type="number" class="main-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <h5>${t("fonts.note_tree_font")}</h5>

    <div class="form-group row">
        <div class="col-4">
            <label for="tree-font-family">${t("fonts.font_family")}</label>
            <select id="tree-font-family" class="tree-font-family form-select"></select>
        </div>

        <div class="col-6">
            <label for="tree-font-size">${t("fonts.size")}</label>

            <div class="input-group tree-font-size-input-group">
                <input id="tree-font-size" type="number" class="tree-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <h5>${t("fonts.note_detail_font")}</h5>

    <div class="form-group row">
        <div class="col-4">
            <label for="detail-font-family">${t("fonts.font_family")}</label>
            <select id="detail-font-family" class="detail-font-family form-select"></select>
        </div>

        <div class="col-6">
            <label for="detail-font-size">${t("fonts.size")}</label>

            <div class="input-group detail-font-size-input-group">
                <input id="detail-font-size" type="number" class="detail-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <h5>${t("fonts.monospace_font")}</h5>

    <div class="form-group row">
        <div class="col-4">
            <label for="monospace-font-family">${t("fonts.font_family")}</label>
            <select id="monospace-font-family" class="monospace-font-family form-select"></select>
        </div>

        <div class="col-6">
            <label for="monospace-font-size">${t("fonts.size")}</label>

            <div class="input-group monospace-font-size-input-group">
                <input id="monospace-font-size" type="number" class="monospace-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <p>${t("fonts.note_tree_and_detail_font_sizing")}</p>

    <p>${t("fonts.not_all_fonts_available")}</p>

    <p>
        ${t("fonts.apply_font_changes")}
        <button class="btn btn-secondary btn-micro reload-frontend-button">${t("fonts.reload_frontend")}</button>
    </p>
</div>`;

export default class FontsOptions extends OptionsWidget {
    private $mainFontSize!: JQuery<HTMLElement>;
    private $mainFontFamily!: JQuery<HTMLElement>;
    private $treeFontSize!: JQuery<HTMLElement>;
    private $treeFontFamily!: JQuery<HTMLElement>;
    private $detailFontSize!: JQuery<HTMLElement>;
    private $detailFontFamily!: JQuery<HTMLElement>;
    private $monospaceFontSize!: JQuery<HTMLElement>;
    private $monospaceFontFamily!: JQuery<HTMLElement>;

    private _isEnabled?: boolean;

    doRender() {
        this.$widget = $(TPL);

        this.$mainFontSize = this.$widget.find(".main-font-size");
        this.$mainFontFamily = this.$widget.find(".main-font-family");

        this.$treeFontSize = this.$widget.find(".tree-font-size");
        this.$treeFontFamily = this.$widget.find(".tree-font-family");

        this.$detailFontSize = this.$widget.find(".detail-font-size");
        this.$detailFontFamily = this.$widget.find(".detail-font-family");

        this.$monospaceFontSize = this.$widget.find(".monospace-font-size");
        this.$monospaceFontFamily = this.$widget.find(".monospace-font-family");

        this.$widget.find(".reload-frontend-button").on("click", () => utils.reloadFrontendApp("changes from appearance options"));
    }

    isEnabled() {
        return !!this._isEnabled;
    }

    async optionsLoaded(options: OptionMap) {
        this._isEnabled = options.overrideThemeFonts === "true";
        this.toggleInt(this._isEnabled);
        if (!this._isEnabled) {
            return;
        }

        this.$mainFontSize.val(options.mainFontSize);
        this.fillFontFamilyOptions(this.$mainFontFamily, options.mainFontFamily);

        this.$treeFontSize.val(options.treeFontSize);
        this.fillFontFamilyOptions(this.$treeFontFamily, options.treeFontFamily);

        this.$detailFontSize.val(options.detailFontSize);
        this.fillFontFamilyOptions(this.$detailFontFamily, options.detailFontFamily);

        this.$monospaceFontSize.val(options.monospaceFontSize);
        this.fillFontFamilyOptions(this.$monospaceFontFamily, options.monospaceFontFamily);

        const optionsToSave: OptionNames[] = ["mainFontFamily", "mainFontSize", "treeFontFamily", "treeFontSize", "detailFontFamily", "detailFontSize", "monospaceFontFamily", "monospaceFontSize"];

        for (const optionName of optionsToSave) {
            const $el = (this as any)[`$${optionName}`];
            $el.on("change", () => this.updateOption(optionName, $el.val()));
        }
    }

    fillFontFamilyOptions($select: JQuery<HTMLElement>, currentValue: string) {
        $select.empty();

        for (const { title, items } of Object.values(FONT_FAMILIES)) {
            const $group = $("<optgroup>").attr("label", title);

            for (const { value, label } of items) {
                $group.append(
                    $("<option>")
                        .attr("value", value)
                        .prop("selected", value === currentValue)
                        .text(label ?? value)
                );
            }

            $select.append($group);
        }
    }
}
