import utils, { escapeQuotes } from "../../services/utils.js";
import treeService from "../../services/tree.js";
import importService, { type UploadFilesOptions } from "../../services/import.js";
import options from "../../services/options.js";
import BasicWidget from "../basic_widget.js";
import { t } from "../../services/i18n.js";
import { Modal, Tooltip } from "bootstrap";
import type { EventData } from "../../components/app_context.js";

const TPL = `
<div class="import-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("import.importIntoNote")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t("import.close")}"></button>
            </div>
            <form class="import-form">
                <div class="modal-body">
                    <div class="form-group">
                        <label for="import-file-upload-input"><strong>${t("import.chooseImportFile")}</strong></label>

                        <label class="tn-file-input tn-input-field">
                            <input type="file" class="import-file-upload-input form-control-file" multiple />
                        </label>

                        <p>${t("import.importDescription")} <strong class="import-note-title"></strong>.
                    </div>

                    <div class="form-group">
                        <strong>${t("import.options")}:</strong>

                        <div class="checkbox">
                            <label class="tn-checkbox" data-bs-toggle="tooltip" title="${escapeQuotes(t("import.safeImportTooltip"))}">
                                <input class="safe-import-checkbox" value="1" type="checkbox" checked>
                                <span>${t("import.safeImport")}</span>
                            </label>
                        </div>

                        <div class="checkbox">
                            <label class="tn-checkbox" data-bs-toggle="tooltip" title="${escapeQuotes(t("import.explodeArchivesTooltip"))}">
                                <input class="explode-archives-checkbox" value="1" type="checkbox" checked>
                                <span>${t("import.explodeArchives")}</span>
                            </label>
                        </div>

                        <div class="checkbox">
                            <label class="tn-checkbox" data-bs-toggle="tooltip" title="${escapeQuotes(t("import.shrinkImagesTooltip"))}">
                                <input class="shrink-images-checkbox" value="1" type="checkbox" checked> <span>${t("import.shrinkImages")}</span>
                            </label>
                        </div>

                        <div class="checkbox">
                            <label class="tn-checkbox">
                                <input class="text-imported-as-text-checkbox" value="1" type="checkbox" checked>
                                ${t("import.textImportedAsText")}
                            </label>
                        </div>

                        <div class="checkbox">
                            <label class="tn-checkbox">
                                <input class="code-imported-as-code-checkbox" value="1" type="checkbox" checked> ${t("import.codeImportedAsCode")}
                            </label>
                        </div>

                        <div class="checkbox">
                            <label class="tn-checkbox">
                                <input class="replace-underscores-with-spaces-checkbox" value="1" type="checkbox" checked>
                                ${t("import.replaceUnderscoresWithSpaces")}
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="import-button btn btn-primary">${t("import.import")}</button>
                </div>
            </form>
        </div>
    </div>
</div>`;

export default class ImportDialog extends BasicWidget {

    private parentNoteId: string | null;

    private $form!: JQuery<HTMLElement>;
    private $noteTitle!: JQuery<HTMLElement>;
    private $fileUploadInput!: JQuery<HTMLInputElement>;
    private $importButton!: JQuery<HTMLElement>;
    private $safeImportCheckbox!: JQuery<HTMLElement>;
    private $shrinkImagesCheckbox!: JQuery<HTMLElement>;
    private $textImportedAsTextCheckbox!: JQuery<HTMLElement>;
    private $codeImportedAsCodeCheckbox!: JQuery<HTMLElement>;
    private $explodeArchivesCheckbox!: JQuery<HTMLElement>;
    private $replaceUnderscoresWithSpacesCheckbox!: JQuery<HTMLElement>;

    constructor() {
        super();

        this.parentNoteId = null;
    }

    doRender() {
        this.$widget = $(TPL);
        Modal.getOrCreateInstance(this.$widget[0]);

        this.$form = this.$widget.find(".import-form");
        this.$noteTitle = this.$widget.find(".import-note-title");
        this.$fileUploadInput = this.$widget.find(".import-file-upload-input");
        this.$importButton = this.$widget.find(".import-button");
        this.$safeImportCheckbox = this.$widget.find(".safe-import-checkbox");
        this.$shrinkImagesCheckbox = this.$widget.find(".shrink-images-checkbox");
        this.$textImportedAsTextCheckbox = this.$widget.find(".text-imported-as-text-checkbox");
        this.$codeImportedAsCodeCheckbox = this.$widget.find(".code-imported-as-code-checkbox");
        this.$explodeArchivesCheckbox = this.$widget.find(".explode-archives-checkbox");
        this.$replaceUnderscoresWithSpacesCheckbox = this.$widget.find(".replace-underscores-with-spaces-checkbox");

        this.$form.on("submit", () => {
            // disabling so that import is not triggered again.
            this.$importButton.attr("disabled", "disabled");

            if (this.parentNoteId) {
                this.importIntoNote(this.parentNoteId);
            }

            return false;
        });

        this.$fileUploadInput.on("change", () => {
            if (this.$fileUploadInput.val()) {
                this.$importButton.removeAttr("disabled");
            } else {
                this.$importButton.attr("disabled", "disabled");
            }
        });

        let _ = [...this.$widget.find('[data-bs-toggle="tooltip"]')].forEach((element) => {
            Tooltip.getOrCreateInstance(element, {
                html: true
            });
        });
    }

    async showImportDialogEvent({ noteId }: EventData<"showImportDialog">) {
        this.parentNoteId = noteId;

        this.$fileUploadInput.val("").trigger("change"); // to trigger Import button disabling listener below

        this.$safeImportCheckbox.prop("checked", true);
        this.$shrinkImagesCheckbox.prop("checked", options.is("compressImages"));
        this.$textImportedAsTextCheckbox.prop("checked", true);
        this.$codeImportedAsCodeCheckbox.prop("checked", true);
        this.$explodeArchivesCheckbox.prop("checked", true);
        this.$replaceUnderscoresWithSpacesCheckbox.prop("checked", true);

        this.$noteTitle.text(await treeService.getNoteTitle(this.parentNoteId));

        utils.openDialog(this.$widget);
    }

    async importIntoNote(parentNoteId: string) {
        const files = Array.from(this.$fileUploadInput[0].files ?? []); // shallow copy since we're resetting the upload button below

        const boolToString = ($el: JQuery<HTMLElement>) => ($el.is(":checked") ? "true" : "false");

        const options: UploadFilesOptions = {
            safeImport: boolToString(this.$safeImportCheckbox),
            shrinkImages: boolToString(this.$shrinkImagesCheckbox),
            textImportedAsText: boolToString(this.$textImportedAsTextCheckbox),
            codeImportedAsCode: boolToString(this.$codeImportedAsCodeCheckbox),
            explodeArchives: boolToString(this.$explodeArchivesCheckbox),
            replaceUnderscoresWithSpaces: boolToString(this.$replaceUnderscoresWithSpacesCheckbox)
        };

        this.$widget.modal("hide");

        await importService.uploadFiles("notes", parentNoteId, files, options);
    }
}
