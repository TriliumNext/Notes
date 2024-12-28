import SpacedUpdate from "../../../services/spaced_update.js";
import AbstractBulkAction from "../abstract_bulk_action.js";
import { t } from "../../../services/i18n.js";

const TPL = `
<tr>
    <td colspan="2">
        <div style="display: flex; align-items: center">
            <div style="margin-right: 10px; flex-shrink: 0;">${t('rename_note.rename_note_title_to')}</div> 
            
            <input type="text" 
                class="form-control new-title" 
                placeholder="${t('rename_note.new_note_title')}" 
                title="${t('rename_note.click_help_icon')}"/>
        </div>
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                <p>${t('rename_note.evaluated_as_js_string')}</p>
                
                <ul>
                    <li>${t('rename_note.example_note')}</li>
                    <li>${t('rename_note.example_new_title')}</li>
                    <li>${t('rename_note.example_date_prefix')}</li>
                </ul>
                
                ${t('rename_note.api_docs')}
            </div>
        </div>
    
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class RenameNoteBulkAction extends AbstractBulkAction {
    static get actionName() { return "renameNote"; }
    static get actionTitle() { return t('rename_note.rename_note'); }

    doRender() {
        const $action = $(TPL);

        const $newTitle = $action.find('.new-title');
        $newTitle.val(this.actionDef.newTitle || "");

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({
                newTitle: $newTitle.val(),
            });
        }, 1000);

        $newTitle.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
