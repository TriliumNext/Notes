import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = /*html*/`
<div class="options-section">
    <h4>${t("heading_style.title")}</h4>

    <div role="group">
        <label class="tn-radio">
            <input name="heading-style" type="radio" value="plain" />
            ${t("heading_style.plain")}
        </label>

        <label class="tn-radio">
            <input name="heading-style" type="radio" value="underline" />
            ${t("heading_style.underline")}
        </label>

        <label class="tn-radio">
            <input name="heading-style" type="radio" value="markdown" />
            ${t("heading_style.markdown")}
        </label>
    </div>
</div>`;

export default class HeadingStyleOptions extends OptionsWidget {

    private $body!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$body = $("body");
        this.$widget.find(`input[name="heading-style"]`).on("change", () => {
            const newHeadingStyle = String(this.$widget.find(`input[name="heading-style"]:checked`).val());

            this.toggleBodyClass("heading-style-", newHeadingStyle);

            this.updateOption("headingStyle", newHeadingStyle);
        });
    }

    async optionsLoaded(options: OptionMap) {
        this.$widget.find(`input[name="heading-style"][value="${options.headingStyle}"]`)
                    .prop("checked", "true");
    }

    toggleBodyClass(prefix: string, value: string) {
        for (const clazz of Array.from(this.$body[0].classList)) {
            // create copy to safely iterate over while removing classes
            if (clazz.startsWith(prefix)) {
                this.$body.removeClass(clazz);
            }
        }

        this.$body.addClass(prefix + value);
    }
}
