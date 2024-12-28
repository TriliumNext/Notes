import server from "../../services/server.js";
import froca from "../../services/froca.js";
import linkService from "../../services/link.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";
import { t } from "../../services/i18n.js";
import FAttribute, { FAttributeRow } from "../../entities/fattribute.js";

// TODO: Use common with server.
interface Response {
    noteIdsToBeDeleted: string[];
    brokenRelations: FAttributeRow[];
}

export interface ResolveOptions {
    proceed: boolean;
    deleteAllClones?: boolean;    
    eraseNotes?: boolean;
}

interface ShowDeleteNotesDialogOpts {
    branchIdsToDelete: string[];
    callback: (opts: ResolveOptions) => void;
    forceDeleteAllClones: boolean;
}

const TPL = `
<div class="delete-notes-dialog modal mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog-scrollable modal-xl" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h4 class="modal-title">${t('delete_notes.delete_notes_preview')}</h4>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t('delete_notes.close')}"></button>
            </div>
            <div class="modal-body">
                <div class="form-checkbox">
                    <input id="delete-all-clones" class="delete-all-clones form-check-input" value="1" type="checkbox">
                    <label for="delete-all-clones" class="form-check-label">${t('delete_notes.delete_all_clones_description')}</label>
                </div>

                <div class="form-checkbox" style="margin-bottom: 1rem">
                    <input id="erase-notes" class="erase-notes form-check-input" value="1" type="checkbox">
                    <label for="erase-notes" class="form-check-label">${t('delete_notes.erase_notes_warning')}</label>
                </div>

                <div class="delete-notes-list-wrapper">
                    <h4>${t('delete_notes.notes_to_be_deleted', { noteCount: '<span class="deleted-notes-count"></span>' })}</h4>

                    <ul class="delete-notes-list" style="max-height: 200px; overflow: auto;"></ul>
                </div>

                <div class="no-note-to-delete-wrapper alert alert-info">
                    ${t('delete_notes.no_note_to_delete')}
                </div>

                <div class="broken-relations-wrapper">
                    <div class="alert alert-danger">
                        <h4>${t('delete_notes.broken_relations_to_be_deleted', { relationCount: '<span class="broke-relations-count"></span>'})}</h4>

                        <ul class="broken-relations-list" style="max-height: 200px; overflow: auto;"></ul>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="delete-notes-dialog-cancel-button btn btn-sm">${t('delete_notes.cancel')}</button>

                &nbsp;

                <button class="delete-notes-dialog-ok-button btn btn-primary btn-sm">${t('delete_notes.ok')}</button>
            </div>
        </div>
    </div>
</div>`;

export default class DeleteNotesDialog extends BasicWidget {

    private branchIds: string[] | null;
    private resolve!: (options: ResolveOptions) => void;

    private $content!: JQuery<HTMLElement>;
    private $okButton!: JQuery<HTMLElement>;
    private $cancelButton!: JQuery<HTMLElement>;
    private $deleteNotesList!: JQuery<HTMLElement>;
    private $brokenRelationsList!: JQuery<HTMLElement>;
    private $deletedNotesCount!: JQuery<HTMLElement>;
    private $noNoteToDeleteWrapper!: JQuery<HTMLElement>;
    private $deleteNotesListWrapper!: JQuery<HTMLElement>;
    private $brokenRelationsListWrapper!: JQuery<HTMLElement>;
    private $brokenRelationsCount!: JQuery<HTMLElement>;
    private $deleteAllClones!: JQuery<HTMLElement>;
    private $eraseNotes!: JQuery<HTMLElement>;

    private forceDeleteAllClones?: boolean;

    constructor() {
        super();

        this.branchIds = null;
    }

    doRender() {
        this.$widget = $(TPL);
        this.$content = this.$widget.find(".recent-changes-content");
        this.$okButton = this.$widget.find(".delete-notes-dialog-ok-button");
        this.$cancelButton = this.$widget.find(".delete-notes-dialog-cancel-button");
        this.$deleteNotesList = this.$widget.find(".delete-notes-list");
        this.$brokenRelationsList = this.$widget.find(".broken-relations-list");
        this.$deletedNotesCount = this.$widget.find(".deleted-notes-count");
        this.$noNoteToDeleteWrapper = this.$widget.find(".no-note-to-delete-wrapper");
        this.$deleteNotesListWrapper = this.$widget.find(".delete-notes-list-wrapper");
        this.$brokenRelationsListWrapper = this.$widget.find(".broken-relations-wrapper");
        this.$brokenRelationsCount = this.$widget.find(".broke-relations-count");
        this.$deleteAllClones = this.$widget.find(".delete-all-clones");
        this.$eraseNotes = this.$widget.find(".erase-notes");

        this.$widget.on('shown.bs.modal', () => this.$okButton.trigger("focus"));

        this.$cancelButton.on('click', () => {
            utils.closeActiveDialog();

            this.resolve({proceed: false});
        });

        this.$okButton.on('click', () => {
            utils.closeActiveDialog();

            this.resolve({
                proceed: true,
                deleteAllClones: this.forceDeleteAllClones || this.isDeleteAllClonesChecked(),
                eraseNotes: this.isEraseNotesChecked()
            });
        });

        this.$deleteAllClones.on('click', () => this.renderDeletePreview());
    }

    async renderDeletePreview() {
        const response = await server.post<Response>('delete-notes-preview', {
            branchIdsToDelete: this.branchIds,
            deleteAllClones: this.forceDeleteAllClones || this.isDeleteAllClonesChecked()
        });

        this.$deleteNotesList.empty();
        this.$brokenRelationsList.empty();

        this.$deleteNotesListWrapper.toggle(response.noteIdsToBeDeleted.length > 0);
        this.$noNoteToDeleteWrapper.toggle(response.noteIdsToBeDeleted.length === 0);

        for (const note of await froca.getNotes(response.noteIdsToBeDeleted)) {
            this.$deleteNotesList.append(
                $("<li>").append(
                    await linkService.createLink(note.noteId, {showNotePath: true})
                )
            );
        }

        this.$deletedNotesCount.text(response.noteIdsToBeDeleted.length);

        this.$brokenRelationsListWrapper.toggle(response.brokenRelations.length > 0);
        this.$brokenRelationsCount.text(response.brokenRelations.length);

        await froca.getNotes(response.brokenRelations.map(br => br.noteId));

        for (const attr of response.brokenRelations) {
            this.$brokenRelationsList.append(
                $("<li>").html(t("delete_notes.deleted_relation_text", {
                    note: (await linkService.createLink(attr.value)).html(),
                    relation: `<code>${attr.name}</code>`,
                    source: (await linkService.createLink(attr.noteId)).html()
                }))
            );
        }
    }

    async showDeleteNotesDialogEvent({branchIdsToDelete, callback, forceDeleteAllClones}: ShowDeleteNotesDialogOpts) {
        this.branchIds = branchIdsToDelete;
        this.forceDeleteAllClones = forceDeleteAllClones;

        await this.renderDeletePreview();

        utils.openDialog(this.$widget);

        this.$deleteAllClones
            .prop("checked", !!forceDeleteAllClones)
            .prop("disabled", !!forceDeleteAllClones);

        this.$eraseNotes.prop("checked", false);

        this.resolve = callback;
    }

    isDeleteAllClonesChecked() {
        return this.$deleteAllClones.is(":checked");
    }

    isEraseNotesChecked() {
        return this.$eraseNotes.is(":checked");
    }
}
