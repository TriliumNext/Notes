import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("attachment_erasure_timeout.attachment_erasure_timeout")}</h4>

    <p>${t("attachment_erasure_timeout.attachment_auto_deletion_description")}</p>

    <div class="form-group">
        <label>${t("attachment_erasure_timeout.erase_attachments_after_x_seconds")}</label>
        <input class="erase-unused-attachments-after-time-in-seconds form-control options-number-input" type="number" min="0">
    </div>
    
    <p>${t("attachment_erasure_timeout.manual_erasing_description")}</p>
    
    <button class="erase-unused-attachments-now-button btn">${t("attachment_erasure_timeout.erase_unused_attachments_now")}</button>
</div>`;

export default class AttachmentErasureTimeoutOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$eraseUnusedAttachmentsAfterTimeInSeconds = this.$widget.find(".erase-unused-attachments-after-time-in-seconds");
        this.$eraseUnusedAttachmentsAfterTimeInSeconds.on('change', () => this.updateOption('eraseUnusedAttachmentsAfterSeconds', this.$eraseUnusedAttachmentsAfterTimeInSeconds.val()));

        this.$eraseUnusedAttachmentsNowButton = this.$widget.find(".erase-unused-attachments-now-button");
        this.$eraseUnusedAttachmentsNowButton.on('click', () => {
            server.post('notes/erase-unused-attachments-now').then(() => {
                toastService.showMessage(t("attachment_erasure_timeout.unused_attachments_erased"));
            });
        });
    }

    async optionsLoaded(options) {
        this.$eraseUnusedAttachmentsAfterTimeInSeconds.val(options.eraseUnusedAttachmentsAfterSeconds);
    }
}
