import { t } from "../../../../services/i18n.js";
import TimeSelector from "../time_selector.js";

const TPL = `
<div class="options-section">
    <h4>${t("password.protected_session_timeout")}</h4>

    <p>${t("password.protected_session_timeout_description")} <a class="tn-link" href="https://triliumnext.github.io/Docs/Wiki/protected-notes.html" class="external">${t("password.wiki")}</a> ${t("password.for_more_info")}</p>
    <div id="time-selector-placeholder"></div>
</div>`;

export default class ProtectedSessionTimeoutOptions extends TimeSelector {
    constructor() {
        super({
            widgetId: "protected-session-timeout",
            widgetLabelId: "password.protected_session_timeout_label",
            optionValueId: "protectedSessionTimeout",
            optionTimeScaleId: "protectedSessionTimeoutTimeScale",
            minimumSeconds: 60
        });
        super.doRender();
    }

    doRender() {
        const $timeSelector = this.$widget;
        // inject TimeSelector widget template
        this.$widget = $(TPL);
        this.$widget.find("#time-selector-placeholder").replaceWith($timeSelector)
    }
}
