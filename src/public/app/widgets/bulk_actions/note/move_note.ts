import { t } from "../../../services/i18n.js";
import SpacedUpdate from "../../../services/spaced_update.js";
import AbstractBulkAction from "../abstract_bulk_action.js";
import noteAutocompleteService from "../../../services/note_autocomplete.js";

const TPL = `
<tr>
    <td colspan="2">
        <div style="display: flex; align-items: center">
            <div style="margin-right: 10px;" class="text-nowrap">${t('move_note.move_note')}</div> 
                            
            <div style="margin-right: 10px;" class="text-nowrap">${t('move_note.to')}</div>
            
            <div class="input-group">
                <input type="text" class="form-control target-parent-note" placeholder="${t('move_note.target_parent_note')}"/>
            </div>
        </div>
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                <p>${t('move_note.on_all_matched_notes')}:</p>
                
                <ul style="margin-bottom: 0;">
                    <li>${t('move_note.move_note_new_parent')}</li>
                    <li>${t('move_note.clone_note_new_parent')}</li>
                    <li>${t('move_note.nothing_will_happen')}</li>
                </ul>
            </div> 
        </div>
    
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class MoveNoteBulkAction extends AbstractBulkAction {
    static get actionName() { return "moveNote"; }
    static get actionTitle() { return t('move_note.move_note'); }

    doRender() {
        const $action = $(TPL);

        const $targetParentNote = $action.find('.target-parent-note');
        noteAutocompleteService.initNoteAutocomplete($targetParentNote);
        $targetParentNote.setNote(this.actionDef.targetParentNoteId);

        $targetParentNote.on('autocomplete:closed', () => spacedUpdate.scheduleUpdate());

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({
                targetParentNoteId: $targetParentNote.getSelectedNoteId()
            });
        }, 1000)

        $targetParentNote.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
