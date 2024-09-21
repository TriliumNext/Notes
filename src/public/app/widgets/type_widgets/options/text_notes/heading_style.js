import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("heading_style.title")}</h4>
    
    <select class="heading-style form-select">
        <option value="plain">${t("heading_style.plain")}</option>
        <option value="underline">${t("heading_style.underline")}</option>
        <option value="markdown">${t("heading_style.markdown")}</option>
    </select>
</div>`;

export default class HeadingStyleOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$body = $("body");
        this.$headingStyle = this.$widget.find(".heading-style");
        this.$headingStyle.on('change', () => {
            const newHeadingStyle = this.$headingStyle.val();

            this.toggleBodyClass("heading-style-", newHeadingStyle);

            this.updateOption('headingStyle', newHeadingStyle);
        });
    }

    async optionsLoaded(options) {
        this.$headingStyle.val(options.headingStyle);
    }

    toggleBodyClass(prefix, value) {
        for (const clazz of Array.from(this.$body[0].classList)) { // create copy to safely iterate over while removing classes
            if (clazz.startsWith(prefix)) {
                this.$body.removeClass(clazz);
            }
        }

        this.$body.addClass(prefix + value);
    }
}
