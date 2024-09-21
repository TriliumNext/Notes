import noteAutocompleteService from "../../services/note_autocomplete.js";
import utils from "../../services/utils.js";
import toastService from "../../services/toast.js";
import froca from "../../services/froca.js";
import branchService from "../../services/branches.js";
import treeService from "../../services/tree.js";
import BasicWidget from "../basic_widget.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="move-to-dialog modal mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" style="max-width: 1000px" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title me-auto">${t("move_to.dialog_title")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form class="move-to-form">
                <div class="modal-body">
                    <h5>${t("move_to.notes_to_move")}</h5>

                    <ul class="move-to-note-list" style="max-height: 200px; overflow: auto;"></ul>

                    <div class="form-group">
                        <label style="width: 100%">
                            ${t("move_to.target_parent_note")}
                            <div class="input-group">
                                <input class="move-to-note-autocomplete form-control" placeholder="${t("move_to.search_placeholder")}">
                            </div>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">${t("move_to.move_button")}</button>
                </div>
            </form>
        </div>
    </div>
</div>`;

export default class MoveToDialog extends BasicWidget {
    constructor() {
        super();

        this.movedBranchIds = null;
    }

    doRender() {
        this.$widget = $(TPL);
        this.$form = this.$widget.find(".move-to-form");
        this.$noteAutoComplete = this.$widget.find(".move-to-note-autocomplete");
        this.$noteList = this.$widget.find(".move-to-note-list");

        this.$form.on('submit', () => {
            const notePath = this.$noteAutoComplete.getSelectedNotePath();

            if (notePath) {
                this.$widget.modal('hide');

                const {noteId, parentNoteId} = treeService.getNoteIdAndParentIdFromUrl(notePath);
                froca.getBranchId(parentNoteId, noteId).then(branchId => this.moveNotesTo(branchId));
            }
            else {
                logError(t("move_to.error_no_path"));
            }

            return false;
        });
    }

    async moveBranchIdsToEvent({branchIds}) {
        this.movedBranchIds = branchIds;

        utils.openDialog(this.$widget);

        this.$noteAutoComplete.val('').trigger('focus');

        this.$noteList.empty();

        for (const branchId of this.movedBranchIds) {
            const branch = froca.getBranch(branchId);
            const note = await froca.getNote(branch.noteId);

            this.$noteList.append($("<li>").text(note.title));
        }

        noteAutocompleteService.initNoteAutocomplete(this.$noteAutoComplete);
        noteAutocompleteService.showRecentNotes(this.$noteAutoComplete);
    }

    async moveNotesTo(parentBranchId) {
        await branchService.moveToParentNote(this.movedBranchIds, parentBranchId);

        const parentBranch = froca.getBranch(parentBranchId);
        const parentNote = await parentBranch.getNote();

        toastService.showMessage(`${t("move_to.move_success_message")} ${parentNote.title}`);
    }
}
