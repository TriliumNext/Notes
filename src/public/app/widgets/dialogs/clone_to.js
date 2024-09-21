import noteAutocompleteService from "../../services/note_autocomplete.js";
import utils from "../../services/utils.js";
import treeService from "../../services/tree.js";
import toastService from "../../services/toast.js";
import froca from "../../services/froca.js";
import branchService from "../../services/branches.js";
import appContext from "../../components/app_context.js";
import BasicWidget from "../basic_widget.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="clone-to-dialog modal mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" style="max-width: 1000px" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title flex-grow-1">${t('clone_to.clone_notes_to')}</h5>
                <button type="button" class="help-button" title="${t('clone_to.help_on_links')}" data-help-page="cloning-notes.html">?</button>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form class="clone-to-form">
                <div class="modal-body">
                    <h5>${t('clone_to.notes_to_clone')}</h5>

                    <ul class="clone-to-note-list" style="max-height: 200px; overflow: auto;"></ul>

                    <div class="form-group">
                        <label style="width: 100%">
                            ${t('clone_to.target_parent_note')}
                            <div class="input-group">
                                <input class="clone-to-note-autocomplete form-control" placeholder="${t('clone_to.search_for_note_by_its_name')}">
                            </div>
                        </label>
                    </div>

                    <div class="form-group" title="${t('clone_to.cloned_note_prefix_title')}">
                        <label style="width: 100%">
                            ${t('clone_to.prefix_optional')}
                            <input class="clone-prefix form-control" style="width: 100%;">
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">${t('clone_to.clone_to_selected_note')}</button>
                </div>
            </form>
        </div>
    </div>
</div>`;

export default class CloneToDialog extends BasicWidget {
    constructor() {
        super();

        this.clonedNoteIds = null;
    }

    doRender() {
        this.$widget = $(TPL);
        this.$form = this.$widget.find(".clone-to-form");
        this.$noteAutoComplete = this.$widget.find(".clone-to-note-autocomplete");
        this.$clonePrefix = this.$widget.find(".clone-prefix");
        this.$noteList = this.$widget.find(".clone-to-note-list");

        this.$form.on('submit', () => {
            const notePath = this.$noteAutoComplete.getSelectedNotePath();

            if (notePath) {
                this.$widget.modal('hide');

                this.cloneNotesTo(notePath);
            }
            else {
                logError(t('clone_to.no_path_to_clone_to'));
            }

            return false;
        });
    }

    async cloneNoteIdsToEvent({ noteIds }) {
        if (!noteIds || noteIds.length === 0) {
            noteIds = [appContext.tabManager.getActiveContextNoteId()];
        }

        this.clonedNoteIds = [];

        for (const noteId of noteIds) {
            if (!this.clonedNoteIds.includes(noteId)) {
                this.clonedNoteIds.push(noteId);
            }
        }

        utils.openDialog(this.$widget);

        this.$noteAutoComplete.val('').trigger('focus');

        this.$noteList.empty();

        for (const noteId of this.clonedNoteIds) {
            const note = await froca.getNote(noteId);

            this.$noteList.append($("<li>").text(note.title));
        }

        noteAutocompleteService.initNoteAutocomplete(this.$noteAutoComplete);
        noteAutocompleteService.showRecentNotes(this.$noteAutoComplete);
    }

    async cloneNotesTo(notePath) {
        const { noteId, parentNoteId } = treeService.getNoteIdAndParentIdFromUrl(notePath);
        const targetBranchId = await froca.getBranchId(parentNoteId, noteId);

        for (const cloneNoteId of this.clonedNoteIds) {
            await branchService.cloneNoteToBranch(cloneNoteId, targetBranchId, this.$clonePrefix.val());

            const clonedNote = await froca.getNote(cloneNoteId);
            const targetNote = await froca.getBranch(targetBranchId).getNote();

            toastService.showMessage(t('clone_to.note_cloned', { clonedTitle: clonedNote.title, targetTitle: targetNote.title }));
        }
    }
}
