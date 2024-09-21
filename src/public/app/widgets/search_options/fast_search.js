import AbstractSearchOption from "./abstract_search_option.js";
import { t } from "../../services/i18n.js";

const TPL = `
<tr data-search-option-conf="fastSearch">
    <td colSpan="2">
        <span class="bx bx-run"></span>
        ${t('fast_search.fast_search')}
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                ${t('fast_search.description')}
            </div> 
        </div>
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class FastSearch extends AbstractSearchOption {
    static get optionName() { return "fastSearch" };
    static get attributeType() { return "label" };

    static async create(noteId) {
        await AbstractSearchOption.setAttribute(noteId,'label', 'fastSearch');
    }

    doRender() {
        return $(TPL);
    }
}
