import server from "../../services/server.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";
import toastService from "../../services/toast.js";
import openService from "../../services/open.js";
import utils from "../../services/utils.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="image-properties">
    <div style="display: flex; justify-content: space-evenly; margin: 10px;">
        <span>
            <strong>${t("image_properties.original_file_name")}:</strong>
            <span class="image-filename"></span>
        </span>

        <span>
            <strong>${t("image_properties.file_type")}:</strong>
            <span class="image-filetype"></span>
        </span>

        <span>
            <strong>${t("image_properties.file_size")}:</strong>
            <span class="image-filesize"></span>
        </span>
    </div>
    
    <div class="no-print" style="display: flex; justify-content: space-evenly; margin: 10px;">
        <button class="image-download btn btn-sm btn-primary" type="button">${t("image_properties.download")}</button>

        <button class="image-open btn btn-sm btn-primary" type="button">${t("image_properties.open")}</button>

        <button class="image-copy-reference-to-clipboard btn btn-sm btn-primary" type="button">${t("image_properties.copy_reference_to_clipboard")}</button>

        <button class="image-upload-new-revision btn btn-sm btn-primary" type="button">${t("image_properties.upload_new_revision")}</button>
    </div>

    <input type="file" class="image-upload-new-revision-input" style="display: none">
</div>`;

export default class ImagePropertiesWidget extends NoteContextAwareWidget {
    get name() {
        return "imageProperties";
    }

    get toggleCommand() {
        return "toggleRibbonTabImageProperties";
    }

    isEnabled() {
        return this.note && this.note.type === 'image';
    }

    getTitle() {
        return {
            show: this.isEnabled(),
            activate: true,
            title: t("image_properties.title"),
            icon: 'bx bx-image'
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$copyReferenceToClipboardButton = this.$widget.find(".image-copy-reference-to-clipboard");
        this.$copyReferenceToClipboardButton.on('click', () => this.triggerEvent(`copyImageReferenceToClipboard`, {ntxId: this.noteContext.ntxId}));

        this.$uploadNewRevisionButton = this.$widget.find(".image-upload-new-revision");
        this.$uploadNewRevisionInput = this.$widget.find(".image-upload-new-revision-input");

        this.$fileName = this.$widget.find(".image-filename");
        this.$fileType = this.$widget.find(".image-filetype");
        this.$fileSize = this.$widget.find(".image-filesize");

        this.$openButton = this.$widget.find(".image-open");
        this.$openButton.on('click', () => openService.openNoteExternally(this.noteId, this.note.mime));

        this.$imageDownloadButton = this.$widget.find(".image-download");
        this.$imageDownloadButton.on('click', () => openService.downloadFileNote(this.noteId));

        this.$uploadNewRevisionButton.on("click", () => {
            this.$uploadNewRevisionInput.trigger("click");
        });

        this.$uploadNewRevisionInput.on('change', async () => {
            const fileToUpload = this.$uploadNewRevisionInput[0].files[0]; // copy to allow reset below
            this.$uploadNewRevisionInput.val('');

            const result = await server.upload(`images/${this.noteId}`, fileToUpload);

            if (result.uploaded) {
                toastService.showMessage(t("image_properties.upload_success"));

                await utils.clearBrowserCache();

                this.refresh();
            } else {
                toastService.showError(t("image_properties.upload_failed", { message: result.message }));
            }
        });
    }

    async refreshWithNote(note) {
        this.$widget.show();

        const blob = await this.note.getBlob();

        this.$fileName.text(note.getLabelValue('originalFileName') || "?");
        this.$fileSize.text(utils.formatSize(blob.contentLength));
        this.$fileType.text(note.mime);
    }
}
