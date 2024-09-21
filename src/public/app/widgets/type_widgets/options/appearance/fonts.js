import OptionsWidget from "../options_widget.js";
import utils from "../../../../services/utils.js";
import { t } from "../../../../services/i18n.js";

const FONT_FAMILIES = [
    { value: "theme", label: t("fonts.theme_defined") },
    { value: "serif", label: "Serif" },
    { value: "sans-serif", label: "Sans Serif" },
    { value: "monospace", label: "Monospace" },
    { value: "Arial", label: "Arial" },
    { value: "Verdana", label: "Verdana" },
    { value: "Helvetica", label: "Helvetica" },
    { value: "Tahoma", label: "Tahoma" },
    { value: "Trebuchet MS", label: "Trebuchet MS" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Georgia", label: "Georgia" },
    { value: "Garamond", label: "Garamond" },
    { value: "Courier New", label: "Courier New" },
    { value: "Brush Script MT", label: "Brush Script MT" },
    { value: "Impact", label: "Impact" },
    { value: "American Typewriter", label: "American Typewriter" },
    { value: "Andalé Mono", label: "Andalé Mono" },
    { value: "Lucida Console", label: "Lucida Console" },
    { value: "Monaco", label: "Monaco" },
    { value: "Bradley Hand", label: "Bradley Hand" },
    { value: "Luminari", label: "Luminari" },
    { value: "Comic Sans MS", label: "Comic Sans MS" },
    { value: "Microsoft YaHei", label: "Microsoft YaHei" },
];

const TPL = `
<div class="options-section">
    <h4>${t("fonts.fonts")}</h4>
    
    <h5>${t("fonts.main_font")}</h5>
    
    <div class="form-group row">
        <div class="col-6">
            <label>${t("fonts.font_family")}</label>
            <select class="main-font-family form-select"></select>
        </div>
    
        <div class="col-6">
            <label>${t("fonts.size")}</label>

            <div class="input-group">
                <input type="number" class="main-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <h5>${t("fonts.note_tree_font")}</h5>

    <div class="form-group row">
        <div class="col-4">
            <label>${t("fonts.font_family")}</label>
            <select class="tree-font-family form-select"></select>
        </div>
    
        <div class="col-6">
            <label>${t("fonts.size")}</label>

            <div class="input-group">
                <input type="number" class="tree-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>
    
    <h5>${t("fonts.note_detail_font")}</h5>
    
    <div class="form-group row">
        <div class="col-4">
            <label>${t("fonts.font_family")}</label>
            <select class="detail-font-family form-select"></select>
        </div>
        
        <div class="col-6">
            <label>${t("fonts.size")}</label>

            <div class="input-group">
                <input type="number" class="detail-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>
    
    <h5>${t("fonts.monospace_font")}</h5>
    
    <div class="form-group row">
        <div class="col-4">
            <label>${t("fonts.font_family")}</label>
            <select class="monospace-font-family form-select"></select>
        </div>
    
        <div class="col-6">
            <label>${t("fonts.size")}</label>

            <div class="input-group">
                <input type="number" class="monospace-font-size form-control options-number-input" min="50" max="200" step="10"/>
                <span class="input-group-text">%</span>
            </div>
        </div>
    </div>

    <p>${t("fonts.note_tree_and_detail_font_sizing")}</p>

    <p>${t("fonts.not_all_fonts_available")}</p>
    
    <p>
        ${t("fonts.apply_font_changes")}
        <button class="btn btn-micro reload-frontend-button">${t("fonts.reload_frontend")}</button>
    </p>
</div>`;

export default class FontsOptions extends OptionsWidget {
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

    async optionsLoaded(options) {
        if (options.overrideThemeFonts !== 'true') {
            this.toggleInt(false);
            return;
        }

        this.toggleInt(true);

        this.$mainFontSize.val(options.mainFontSize);
        this.fillFontFamilyOptions(this.$mainFontFamily, options.mainFontFamily);

        this.$treeFontSize.val(options.treeFontSize);
        this.fillFontFamilyOptions(this.$treeFontFamily, options.treeFontFamily);

        this.$detailFontSize.val(options.detailFontSize);
        this.fillFontFamilyOptions(this.$detailFontFamily, options.detailFontFamily);

        this.$monospaceFontSize.val(options.monospaceFontSize);
        this.fillFontFamilyOptions(this.$monospaceFontFamily, options.monospaceFontFamily);

        const optionsToSave = [
            'mainFontFamily', 'mainFontSize',
            'treeFontFamily', 'treeFontSize',
            'detailFontFamily', 'detailFontSize',
            'monospaceFontFamily', 'monospaceFontSize'
        ];

        for (const optionName of optionsToSave) {
            this[`$${optionName}`].on('change', () =>
                this.updateOption(optionName, this[`$${optionName}`].val()));
        }
    }

    fillFontFamilyOptions($select, currentValue) {
        $select.empty();

        for (const {value, label} of FONT_FAMILIES) {
            $select.append($("<option>")
                .attr("value", value)
                .prop("selected", value === currentValue)
                .text(label));
        }
    }
}
