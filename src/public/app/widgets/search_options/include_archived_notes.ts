import AbstractSearchOption from "./abstract_search_option.js";
import { t } from "../../services/i18n.js";

const TPL = /*html*/`
<tr data-search-option-conf="includeArchivedNotes">
    <td colspan="2">
        <span class="bx bx-archive"></span>
        ${t("include_archived_notes.include_archived_notes")}
    </td>
    <td class="button-column">
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class IncludeArchivedNotes extends AbstractSearchOption {
    static get optionName() {
        return "includeArchivedNotes";
    }
    static get attributeType() {
        return "label";
    }

    static async create(noteId: string) {
        await AbstractSearchOption.setAttribute(noteId, "label", "includeArchivedNotes");
    }

    doRender() {
        return $(TPL);
    }
}
