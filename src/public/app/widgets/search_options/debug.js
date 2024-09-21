import AbstractSearchOption from "./abstract_search_option.js";
import { t } from "../../services/i18n.js";

const TPL = `
<tr data-search-option-conf="debug">
    <td colSpan="2">
        <span class="bx bx-bug"></span>
        ${t("debug.debug")}
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                <p>${t("debug.debug_info")}</p>
                ${t("debug.access_info")}
            </div>
        </div>
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class Debug extends AbstractSearchOption {
    static get optionName() { return "debug" };
    static get attributeType() { return "label" };

    static async create(noteId) {
        await AbstractSearchOption.setAttribute(noteId,'label', 'debug');
    }

    doRender() {
        return $(TPL);
    }
}
