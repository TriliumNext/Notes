import { t } from "../../../services/i18n.js";
import SpacedUpdate from "../../../services/spaced_update.js";
import AbstractBulkAction from "../abstract_bulk_action.js";

const TPL = `
<tr>
    <td colspan="2">
        <div style="display: flex; align-items: center">
            <div style="margin-right: 10px; flex-shrink: 0;">${t("rename_label.rename_label_from")}</div> 
            
            <input type="text" 
                class="form-control old-label-name" 
                placeholder="${t("rename_label.old_name_placeholder")}" 
                pattern="[\\p{L}\\p{N}_:]+"
                title="${t("rename_label.name_title")}"/>
            
            <div style="margin-right: 10px; margin-left: 10px;" class="text-nowrap">${t("rename_label.to")}</div> 
            
            <input type="text" 
                class="form-control new-label-name" 
                placeholder="${t("rename_label.new_name_placeholder")}"
                pattern="[\\p{L}\\p{N}_:]+"
                title="${t("rename_label.name_title")}"/>
        </div>
    </td>
    <td class="button-column">
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class RenameLabelBulkAction extends AbstractBulkAction {
    static get actionName() { return "renameLabel"; }
    static get actionTitle() { return t("rename_label.rename_label"); }

    doRender() {
        const $action = $(TPL);

        const $oldLabelName = $action.find('.old-label-name');
        $oldLabelName.val(this.actionDef.oldLabelName || "");

        const $newLabelName = $action.find('.new-label-name');
        $newLabelName.val(this.actionDef.newLabelName || "");

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({
                oldLabelName: $oldLabelName.val(),
                newLabelName: $newLabelName.val()
            });
        }, 1000);

        $oldLabelName.on('input', () => spacedUpdate.scheduleUpdate());
        $newLabelName.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
