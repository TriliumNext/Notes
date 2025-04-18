import AbstractSearchOption from "./abstract_search_option.js";
import { t } from "../../services/i18n.js";

const TPL = /*html*/`
<tr data-search-option-conf="limit">
    <td class="title-column">
        <span class="bx bx-stop"></span>
        ${t("limit.limit")}
    </td>
    <td>
        <input name="limit" class="form-control" type="number" min="1" step="1" />
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
            <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
            <div class="dropdown-menu dropdown-menu-right p-4">
                ${t("limit.take_first_x_results")}
            </div>
        </div>

        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class Limit extends AbstractSearchOption {

    private $limit!: JQuery<HTMLElement>;

    static get optionName() {
        return "limit";
    }
    static get attributeType() {
        return "label";
    }

    static async create(noteId: string) {
        await AbstractSearchOption.setAttribute(noteId, "label", "limit", "10");
    }

    doRender() {
        const $option = $(TPL);

        this.$limit = $option.find("input[name=limit]");
        this.$limit.on("change", () => this.update());
        this.$limit.on("input", () => this.update());
        this.$limit.val(this.note.getLabelValue("limit") ?? "");

        return $option;
    }

    async update() {
        const limit = String(this.$limit.val());

        await this.setAttribute("label", "limit", limit);
    }
}
