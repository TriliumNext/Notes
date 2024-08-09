import { t } from "../../../services/i18n.js";
import SpacedUpdate from "../../../services/spaced_update.js";
import AbstractBulkAction from "../abstract_bulk_action.js";

const TPL = `
<tr>
    <td>
        ${t("delete_label.delete_label")}
    </td>
    <td>
        <input type="text" 
           class="form-control label-name"
           pattern="[\\p{L}\\p{N}_:]+"
           title="${t("delete_label.label_name_title")}"
           placeholder="${t("delete_label.label_name_placeholder")}"/>
    </td>
    <td class="button-column">
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class DeleteLabelBulkAction extends AbstractBulkAction {
    static get actionName() { return "deleteLabel"; }
    static get actionTitle() { return t("delete_label.delete_label"); }

    doRender() {
        const $action = $(TPL);
        const $labelName = $action.find('.label-name');
        $labelName.val(this.actionDef.labelName || "");

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({ labelName: $labelName.val() });
        }, 1000)

        $labelName.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
