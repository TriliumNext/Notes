import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import { t } from "../../../../services/i18n.js";
import TimeSelector from "../time_selector.js";

const TPL = `
<div class="options-section">
    <h4>${t("attachment_erasure_timeout.attachment_erasure_timeout")}</h4>

    <p>${t("attachment_erasure_timeout.attachment_auto_deletion_description")}</p>
`;

const TPL2 = `
    <p>${t("attachment_erasure_timeout.manual_erasing_description")}</p>

    <button class="erase-unused-attachments-now-button btn btn-secondary">${t("attachment_erasure_timeout.erase_unused_attachments_now")}</button>
</div>`;

export default class AttachmentErasureTimeoutOptions extends TimeSelector {
    private $eraseUnusedAttachmentsNowButton!: JQuery<HTMLElement>;

    constructor() {
        super({
            widgetId: "erase-unused-attachments-after",
            widgetLabelId: "attachment_erasure_timeout.erase_attachments_after_x_seconds",
            optionValueId: "eraseUnusedAttachmentsAfterSeconds",
            optionTimeScaleId: "eraseUnusedAttachmentsAfterTimeScale"
        });
        super.doRender();
    }

    doRender() {
        this.$widget = $(TPL).append(this.$widget).append(TPL2);

        this.$eraseUnusedAttachmentsNowButton = this.$widget.find(".erase-unused-attachments-now-button");
        this.$eraseUnusedAttachmentsNowButton.on("click", () => {
            server.post("notes/erase-unused-attachments-now").then(() => {
                toastService.showMessage(t("attachment_erasure_timeout.unused_attachments_erased"));
            });
        });
    }
}
