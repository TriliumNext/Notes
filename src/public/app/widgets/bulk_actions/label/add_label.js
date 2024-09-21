import { t } from "../../../services/i18n.js";
import SpacedUpdate from "../../../services/spaced_update.js";
import AbstractBulkAction from "../abstract_bulk_action.js";

const TPL = `
<tr>
    <td colspan="2">
        <div style="display: flex; align-items: center">
            <div style="margin-right: 10px;" class="text-nowrap">${t("add_label.add_label")}</div> 
            
            <input type="text" 
                class="form-control label-name" 
                placeholder="${t("add_label.label_name_placeholder")}"
                pattern="[\\p{L}\\p{N}_:]+"
                title="${t("add_label.label_name_title")}"/>
            
            <div style="margin-right: 10px; margin-left: 10px;" class="text-nowrap">${t("add_label.to_value")}</div>
            
            <input type="text" class="form-control label-value" placeholder="${t("add_label.new_value_placeholder")}"/>
        </div>
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                <p>${t("add_label.help_text")}</p>
                
                <ul>
                    <li>${t("add_label.help_text_item1")}</li>
                    <li>${t("add_label.help_text_item2")}</li>
                </ul>
                
                ${t("add_label.help_text_note")}
            </div> 
        </div>
    
        <span class="bx bx-x icon-action action-conf-del"></span>
    </td>
</tr>`;

export default class AddLabelBulkAction extends AbstractBulkAction {
    static get actionName() { return "addLabel"; }
    static get actionTitle() { return t("add_label.add_label"); }

    doRender() {
        const $action = $(TPL);

        const $labelName = $action.find('.label-name');
        $labelName.val(this.actionDef.labelName || "");

        const $labelValue = $action.find('.label-value');
        $labelValue.val(this.actionDef.labelValue || "");

        const spacedUpdate = new SpacedUpdate(async () => {
            await this.saveAction({
                labelName: $labelName.val(),
                labelValue: $labelValue.val()
            });
        }, 1000);

        $labelName.on('input', () => spacedUpdate.scheduleUpdate());
        $labelValue.on('input', () => spacedUpdate.scheduleUpdate());

        return $action;
    }
}
