import { t } from "../../services/i18n.js";
import utils, { escapeQuotes } from "../../services/utils.js";
import treeService from "../../services/tree.js";
import importService from "../../services/import.js";
import options from "../../services/options.js";
import BasicWidget from "../basic_widget.js";
import { Modal, Tooltip } from "bootstrap";
import type { EventData } from "../../components/app_context.js";

const TPL = `
<div class="upload-attachments-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("upload_attachments.upload_attachments_to_note")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t("upload_attachments.close")}"></button>
            </div>
            <form class="upload-attachment-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="upload-attachment-file-upload-input"><strong>${t("upload_attachments.choose_files")}</strong></label>
                            <label class="tn-file-input tn-input-field">
                                <input type="file" class="upload-attachment-file-upload-input form-control-file" multiple />
                            </label>
                        <p>${t("upload_attachments.files_will_be_uploaded")} <strong class="upload-attachment-note-title"></strong>.</p>
                    </div>

                    <div class="form-group">
                        <strong>${t("upload_attachments.options")}:</strong>
                        <div class="checkbox">
                            <label class="tn-checkbox" data-bs-toggle="tooltip" title="${escapeQuotes(t("upload_attachments.tooltip"))}">
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

    private parentNoteId: string | null;
    private modal!: bootstrap.Modal;
    private $form!: JQuery<HTMLElement>;
    private $noteTitle!: JQuery<HTMLElement>;
    private $fileUploadInput!: JQuery<HTMLInputElement>;
    private $uploadButton!: JQuery<HTMLElement>;
    private $shrinkImagesCheckbox!: JQuery<HTMLElement>;

    constructor() {
        super();

        this.parentNoteId = null;
    }

    doRender() {
        this.$widget = $(TPL);
        this.modal = Modal.getOrCreateInstance(this.$widget[0]);

        this.$form = this.$widget.find(".upload-attachment-form");
        this.$noteTitle = this.$widget.find(".upload-attachment-note-title");
        this.$fileUploadInput = this.$widget.find(".upload-attachment-file-upload-input");
        this.$uploadButton = this.$widget.find(".upload-attachment-button");
        this.$shrinkImagesCheckbox = this.$widget.find(".shrink-images-checkbox");

        this.$form.on("submit", () => {
            // disabling so that import is not triggered again.
            this.$uploadButton.attr("disabled", "disabled");
            if (this.parentNoteId) {
                this.uploadAttachments(this.parentNoteId);
            }
            return false;
        });

        this.$fileUploadInput.on("change", () => {
            if (this.$fileUploadInput.val()) {
                this.$uploadButton.removeAttr("disabled");
            } else {
                this.$uploadButton.attr("disabled", "disabled");
            }
        });

        Tooltip.getOrCreateInstance(this.$widget.find('[data-bs-toggle="tooltip"]')[0], {
            html: true
        });
    }

    async showUploadAttachmentsDialogEvent({ noteId }: EventData<"showUploadAttachmentsDialog">) {
        this.parentNoteId = noteId;

        this.$fileUploadInput.val("").trigger("change"); // to trigger upload button disabling listener below
        this.$shrinkImagesCheckbox.prop("checked", options.is("compressImages"));

        this.$noteTitle.text(await treeService.getNoteTitle(this.parentNoteId));

        utils.openDialog(this.$widget);
    }

    async uploadAttachments(parentNoteId: string) {
        const files = Array.from(this.$fileUploadInput[0].files ?? []); // shallow copy since we're resetting the upload button below

        function boolToString($el: JQuery<HTMLElement>): "true" | "false" {
            return ($el.is(":checked") ? "true" : "false");
        }

        const options = {
            shrinkImages: boolToString(this.$shrinkImagesCheckbox)
        };

        this.modal.hide();

        await importService.uploadFiles("attachments", parentNoteId, files, options);
    }
}
