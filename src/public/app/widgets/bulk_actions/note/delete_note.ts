import { t } from "../../../services/i18n.js";
import AbstractBulkAction from "../abstract_bulk_action.js";

const TPL = `
<tr>
    <td colspan="2">
        <span class="bx bx-trash"></span>
    
        ${t("delete_note.delete_matched_notes")}
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                <p>${t("delete_note.delete_matched_notes_description")}</p>
                 
                <p>${t("delete_note.undelete_notes_instruction")}</p>
                
                ${t("delete_note.erase_notes_instruction")}
            </div>
        </div>
        
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class DeleteNoteBulkAction extends AbstractBulkAction {
    static get actionName() { return "deleteNote"; }
    static get actionTitle() { return t("delete_note.delete_note"); }

    doRender() {
        return $(TPL);
    }
}
