import { t } from "../../services/i18n.js";
import utils from '../../services/utils.js';
import treeService from "../../services/tree.js";
import importService from "../../services/import.js";
import options from "../../services/options.js";
import BasicWidget from "../basic_widget.js";

const TPL = `
<div class="upload-attachments-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("upload_attachments.upload_attachments_to_note")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form class="upload-attachment-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="upload-attachment-file-upload-input"><strong>${t("upload_attachments.choose_files")}</strong></label>
                        <input type="file" class="upload-attachment-file-upload-input form-control-file" multiple />
                        <p>${t("upload_attachments.files_will_be_uploaded")} <strong class="upload-attachment-note-title"></strong>.</p>
                    </div>

                    <div class="form-group">
                        <strong>${t("upload_attachments.options")}:</strong>
                        <div class="checkbox">
                            <label data-bs-toggle="tooltip" title="${t("upload_attachments.tooltip")}">
                                <input class="shrink-images-checkbox form-check-input" value="1" type="checkbox" checked> <span>${t("upload_attachments.shrink_images")}</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="upload-attachment-button btn btn-primary">${t("upload_attachments.upload")}</button>
                </div>
            </form>
        </div>
    </div>
</div>`;

export default class UploadAttachmentsDialog extends BasicWidget {
    constructor() {
        super();

        this.parentNoteId = null;
    }

    doRender() {
        this.$widget = $(TPL);
        this.modal = bootstrap.Modal.getOrCreateInstance(this.$widget);

        this.$form = this.$widget.find(".upload-attachment-form");
        this.$noteTitle = this.$widget.find(".upload-attachment-note-title");
        this.$fileUploadInput = this.$widget.find(".upload-attachment-file-upload-input");
        this.$uploadButton = this.$widget.find(".upload-attachment-button");
        this.$shrinkImagesCheckbox = this.$widget.find(".shrink-images-checkbox");

        this.$form.on('submit', () => {
            // disabling so that import is not triggered again.
            this.$uploadButton.attr("disabled", "disabled");
            this.uploadAttachments(this.parentNoteId);
            return false;
        });

        this.$fileUploadInput.on('change', () => {
            if (this.$fileUploadInput.val()) {
                this.$uploadButton.removeAttr("disabled");
            }
            else {
                this.$uploadButton.attr("disabled", "disabled");
            }
        });

        bootstrap.Tooltip.getOrCreateInstance(this.$widget.find('[data-bs-toggle="tooltip"]'), {
            html: true
        });
    }

    async showUploadAttachmentsDialogEvent({ noteId }) {
        this.parentNoteId = noteId;

        this.$fileUploadInput.val('').trigger('change'); // to trigger upload button disabling listener below
        this.$shrinkImagesCheckbox.prop("checked", options.is('compressImages'));

        this.$noteTitle.text(await treeService.getNoteTitle(this.parentNoteId));

        utils.openDialog(this.$widget);
    }

    async uploadAttachments(parentNoteId) {
        const files = Array.from(this.$fileUploadInput[0].files); // shallow copy since we're resetting the upload button below

        const boolToString = $el => $el.is(":checked") ? "true" : "false";

        const options = {
            shrinkImages: boolToString(this.$shrinkImagesCheckbox),
        };

        this.modal.hide();

        await importService.uploadFiles('attachments', parentNoteId, files, options);
    }
}
