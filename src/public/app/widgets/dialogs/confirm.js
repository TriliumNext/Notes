import BasicWidget from "../basic_widget.js";
import { t } from "../../services/i18n.js";

const DELETE_NOTE_BUTTON_CLASS = "confirm-dialog-delete-note";

const TPL = `
<div class="confirm-dialog modal mx-auto" tabindex="-1" role="dialog" style="z-index: 2000;">
    <div class="modal-dialog modal-dialog-scrollable" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t('confirm.confirmation')}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="confirm-dialog-content"></div>

                <div class="confirm-dialog-custom"></div>
            </div>
            <div class="modal-footer">
                <button class="confirm-dialog-cancel-button btn btn-sm">${t('confirm.cancel')}</button>

                &nbsp;

                <button class="confirm-dialog-ok-button btn btn-primary btn-sm">${t('confirm.ok')}</button>
            </div>
        </div>
    </div>
</div>`;

export default class ConfirmDialog extends BasicWidget {
    constructor() {
        super();

        this.resolve = null;
        this.$originallyFocused = null; // element focused before the dialog was opened, so we can return to it afterward
    }

    doRender() {
        this.$widget = $(TPL);
        this.modal = bootstrap.Modal.getOrCreateInstance(this.$widget);
        this.$confirmContent = this.$widget.find(".confirm-dialog-content");
        this.$okButton = this.$widget.find(".confirm-dialog-ok-button");
        this.$cancelButton = this.$widget.find(".confirm-dialog-cancel-button");
        this.$custom = this.$widget.find(".confirm-dialog-custom");

        this.$widget.on('shown.bs.modal', () => this.$okButton.trigger("focus"));

        this.$widget.on("hidden.bs.modal", () => {
            if (this.resolve) {
                this.resolve(false);
            }

            if (this.$originallyFocused) {
                this.$originallyFocused.trigger('focus');
                this.$originallyFocused = null;
            }
        });

        this.$cancelButton.on('click', () => this.doResolve(false));
        this.$okButton.on('click', () => this.doResolve(true));
    }

    showConfirmDialogEvent({ message, callback }) {
        this.$originallyFocused = $(':focus');

        this.$custom.hide();

        glob.activeDialog = this.$widget;

        if (typeof message === 'string') {
            message = $("<div>").text(message);
        }

        this.$confirmContent.empty().append(message);

        this.modal.show();

        this.resolve = callback;
    }

    showConfirmDeleteNoteBoxWithNoteDialogEvent({ title, callback }) {
        glob.activeDialog = this.$widget;

        this.$confirmContent.text(`${t('confirm.are_you_sure_remove_note', { title: title })}`);

        this.$custom.empty()
            .append("<br/>")
            .append($("<div>")
                .addClass("form-check")
                .append(
                    $("<label>")
                        .addClass("form-check-label")
                        .attr("style", "text-decoration: underline dotted var(--main-text-color)")
                        .attr("title", `${t('confirm.if_you_dont_check')}`)
                        .append(
                            $("<input>")
                                .attr("type", "checkbox")
                                .addClass(`form-check-input ${DELETE_NOTE_BUTTON_CLASS}`)
                        )
                        .append(`${t('confirm.also_delete_note')}`)
                ));

        this.$custom.show();

        this.modal.show();

        this.resolve = callback;
    }

    doResolve(ret) {
        this.resolve({
            confirmed: ret,
            isDeleteNoteChecked: this.$widget.find(`.${DELETE_NOTE_BUTTON_CLASS}:checked`).length > 0
        });

        this.resolve = null;

        this.modal.hide();
    }
}
