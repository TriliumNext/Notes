import { t } from "../../services/i18n.js";
import noteTypesService from "../../services/note_types.js";
import BasicWidget from "../basic_widget.js";

const TPL = `
<div class="note-type-chooser-dialog modal mx-auto" tabindex="-1" role="dialog">
    <style>
        .note-type-chooser-dialog {
            /* note type chooser needs to be higher than other dialogs from which it is triggered, e.g. "add link"*/
            z-index: 1100 !important;
        }
        
        .note-type-chooser-dialog .note-type-dropdown {
            position: relative;
            font-size: large;
            padding: 20px;
            width: 100%;
            margin-top: 15px;
            max-height: 80vh;
            overflow: auto;
        }
    </style>
    <div class="modal-dialog" style="max-width: 500px;" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("note_type_chooser.modal_title")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                ${t("note_type_chooser.modal_body")}

                <div class="dropdown" style="display: flex;">
                    <button class="note-type-dropdown-trigger" type="button" style="display: none;"
                            data-bs-toggle="dropdown" data-bs-display="static">
                    </button>

                    <div class="note-type-dropdown dropdown-menu"></div>
                </div>
            </div>
        </div>
    </div>
</div>`;

export default class NoteTypeChooserDialog extends BasicWidget {
    constructor(props) {
        super(props);

        this.resolve = null;
        this.$originalFocused = null; // element focused before the dialog was opened, so we can return to it afterward
        this.$originalDialog = null;
    }

    doRender() {
        this.$widget = $(TPL);
        this.modal = bootstrap.Modal.getOrCreateInstance(this.$widget);

        this.$noteTypeDropdown = this.$widget.find(".note-type-dropdown");
        this.dropdown = bootstrap.Dropdown.getOrCreateInstance(this.$widget.find(".note-type-dropdown-trigger"));

        this.$widget.on("hidden.bs.modal", () => {
            if (this.resolve) {
                this.resolve({ success: false });
            }

            if (this.$originalFocused) {
                this.$originalFocused.trigger('focus');
                this.$originalFocused = null;
            }

            glob.activeDialog = this.$originalDialog;
        });

        this.$noteTypeDropdown.on('click', '.dropdown-item', e => this.doResolve(e));

        this.$noteTypeDropdown.on('focus', '.dropdown-item', e => {
            this.$noteTypeDropdown.find('.dropdown-item').each((i, el) => {
                $(el).toggleClass('active', el === e.target);
            });
        });

        this.$noteTypeDropdown.on('keydown', '.dropdown-item', e => {
            if (e.key === 'Enter') {
                this.doResolve(e);
                e.preventDefault();
                return false;
            }
        });

        this.$noteTypeDropdown.parent().on('hide.bs.dropdown', e => {
            // prevent closing dropdown by clicking outside
            if (e.clickEvent) {
                e.preventDefault();
            }
        });
    }

    async chooseNoteTypeEvent({ callback }) {
        this.$originalFocused = $(':focus');

        const noteTypes = await noteTypesService.getNoteTypeItems();

        this.$noteTypeDropdown.empty();

        for (const noteType of noteTypes) {
            if (noteType.title === '----') {
                this.$noteTypeDropdown.append($('<h6 class="dropdown-header">').append(t("note_type_chooser.templates")));
            }
            else {
                this.$noteTypeDropdown.append(
                    $('<a class="dropdown-item" tabindex="0">')
                        .attr("data-note-type", noteType.type)
                        .attr("data-template-note-id", noteType.templateNoteId)
                        .append($("<span>").addClass(noteType.uiIcon))
                        .append(` ${noteType.title}`)
                );
            }
        }

        this.dropdown.show();

        this.$originalDialog = glob.activeDialog;
        glob.activeDialog = this.modal;
        this.modal.show();

        this.$noteTypeDropdown.find(".dropdown-item:first").focus();

        this.resolve = callback;
    }

    doResolve(e) {
        const $item = $(e.target).closest(".dropdown-item");
        const noteType = $item.attr("data-note-type");
        const templateNoteId = $item.attr("data-template-note-id");

        this.resolve({
            success: true,
            noteType,
            templateNoteId
        });
        this.resolve = null;

        this.modal.hide();
    }
}
