import SpacedUpdate from "../../../services/spaced_update.js";
import AbstractBulkAction from "../abstract_bulk_action.js";
import noteAutocompleteService from "../../../services/note_autocomplete.js";
import { t } from "../../../services/i18n.js";

const TPL = `
<tr>
    <td colspan="2">
        <div style="display: flex; align-items: center">
            <div style="margin-right: 10px;" class="text-nowrap">${t('add_relation.add_relation')}</div> 

            <input type="text" 
                class="form-control relation-name" 
                placeholder="${t('add_relation.relation_name')}"
                pattern="[\\p{L}\\p{N}_:]+"
                style="flex-shrink: 3"
                title="${t('add_relation.allowed_characters')}"/>
                
            <div style="margin-right: 10px; margin-left: 10px;" class="text-nowrap">${t('add_relation.to')}</div>
            
            <div class="input-group" style="flex-shrink: 2">
                <input type="text" class="form-control target-note" placeholder="${t('add_relation.target_note')}"/>
            </div>
        </div>
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                ${t('add_relation.create_relation_on_all_matched_notes')}
            </div> 
        </div>
    
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class AddRelationBulkAction extends AbstractBulkAction {
    static get actionName() { return "addRelation"; }
    static get actionTitle() { return t('add_relation.add_relation'); }

    doRender() {
        const $action = $(TPL);

        const $relationName = $action.find('.relation-name');
        $relationName.val(this.actionDef.relationName || "");

        const $targetNote = $action.find('.target-note');
        noteAutocompleteService.initNoteAutocomplete($targetNote);
        $targetNote.setNote(this.actionDef.targetNoteId);

        $targetNote.on('autocomplete:closed', () => spacedUpdate.scheduleUpdate());

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({
                relationName: $relationName.val(),
                targetNoteId: $targetNote.getSelectedNoteId()
            });
        }, 1000);

        $relationName.on('input', () => spacedUpdate.scheduleUpdate());
        $targetNote.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
