import { t } from "../../services/i18n.js";
import server from "../../services/server.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";

const TPL = `<div class="sort-child-notes-dialog modal mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" style="max-width: 500px" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("sort_child_notes.sort_children_by")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form class="sort-child-notes-form">
                <div class="modal-body">
                    <h5>${t("sort_child_notes.sorting_criteria")}</h5>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sort-by" value="title" checked>
                        <label class="form-check-label">${t("sort_child_notes.title")}</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sort-by" value="dateCreated">
                        <label class="form-check-label">${t("sort_child_notes.date_created")}</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sort-by" value="dateModified">
                        <label class="form-check-label">${t("sort_child_notes.date_modified")}</label>
                    </div>
                    <br/>
                    <h5>${t("sort_child_notes.sorting_direction")}</h5>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sort-direction" value="asc" checked>
                        <label class="form-check-label">${t("sort_child_notes.ascending")}</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="sort-direction" value="desc">
                        <label class="form-check-label">${t("sort_child_notes.descending")}</label>
                    </div>
                    <br />
                    <h5>${t("sort_child_notes.folders")}</h5>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="sort-folders-first" value="1">
                        <label class="form-check-label">${t("sort_child_notes.sort_folders_at_top")}</label>
                    </div>
                    <br />
                    <h5>${t("sort_child_notes.natural_sort")}</h5>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="sort-natural" value="1">
                        <label class="form-check-label">${t("sort_child_notes.sort_with_respect_to_different_character_sorting")}</label>
                    </div>
                    <br />
                    <div class="form-check">
                        <label>
                            ${t("sort_child_notes.natural_sort_language")}
                            <input class="form-control" name="sort-locale">
                            ${t("sort_child_notes.the_language_code_for_natural_sort")}
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-primary">${t("sort_child_notes.sort")} <kbd>enter</kbd></button>
                </div>
            </form>
        </div>
    </div>
</div>`;

export default class SortChildNotesDialog extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$form = this.$widget.find(".sort-child-notes-form");

        this.$form.on('submit', async () => {
            const sortBy = this.$form.find("input[name='sort-by']:checked").val();
            const sortDirection = this.$form.find("input[name='sort-direction']:checked").val();
            const foldersFirst = this.$form.find("input[name='sort-folders-first']").is(":checked");
            const sortNatural = this.$form.find("input[name='sort-natural']").is(":checked");
            const sortLocale = this.$form.find("input[name='sort-locale']").val();

            await server.put(`notes/${this.parentNoteId}/sort-children`, { sortBy, sortDirection, foldersFirst, sortNatural, sortLocale });

            utils.closeActiveDialog();
        });
    }

    async sortChildNotesEvent({ node }) {
        this.parentNoteId = node.data.noteId;

        utils.openDialog(this.$widget);

        this.$form.find('input:first').focus();
    }
}
