import { t } from "../../../services/i18n.js";
import AbstractBulkAction from "../abstract_bulk_action.js";

const TPL = `
<tr>
    <td colspan="2">
        <span class="bx bx-trash"></span>
        ${t('delete_revisions.delete_note_revisions')}
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                ${t('delete_revisions.all_past_note_revisions')}
            </div>
        </div>
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class DeleteRevisionsBulkAction extends AbstractBulkAction {
    static get actionName() { return "deleteRevisions"; }
    static get actionTitle() { return t('delete_revisions.delete_note_revisions'); }

    doRender() {
        return $(TPL);
    }
}
