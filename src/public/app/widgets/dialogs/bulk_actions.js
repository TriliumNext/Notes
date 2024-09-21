import BasicWidget from "../basic_widget.js";
import froca from "../../services/froca.js";
import bulkActionService from "../../services/bulk_action.js";
import utils from "../../services/utils.js";
import server from "../../services/server.js";
import toastService from "../../services/toast.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="bulk-actions-dialog modal mx-auto" tabindex="-1" role="dialog">
    <style>
        .bulk-actions-dialog .modal-body h4:not(:first-child) {
            margin-top: 20px;
        }
    
        .bulk-actions-dialog .bulk-available-action-list button {
            padding: 2px 7px;
            margin-right: 10px;
            margin-bottom: 5px;
        }
    
        .bulk-actions-dialog .bulk-existing-action-list {
            width: 100%;
        }
    
        .bulk-actions-dialog .bulk-existing-action-list td {
            padding: 7px;
        }
    
        .bulk-actions-dialog .bulk-existing-action-list .button-column {
            /* minimal width so that table remains static sized and most space remains for middle column with settings */
            width: 50px;
            white-space: nowrap;
            text-align: right;
        }
    </style>

    <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t('bulk_actions.bulk_actions')}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t('bulk_actions.close')}"></button>
            </div>
            <div class="modal-body">
                <h4>${t('bulk_actions.affected_notes')}: <span class="affected-note-count">0</span></h4>

                <div class="form-check">
                    <input class="include-descendants form-check-input" type="checkbox" value="">
                    <label class="form-check-label">${t('bulk_actions.include_descendants')}</label>
                </div>

                <h4>${t('bulk_actions.available_actions')}</h4>

                <table class="bulk-available-action-list"></table>

                <h4>${t('bulk_actions.chosen_actions')}</h4>

                <table class="bulk-existing-action-list"></table>
            </div>
            <div class="modal-footer">
                <button type="submit" class="execute-bulk-actions btn btn-primary">${t('bulk_actions.execute_bulk_actions')}</button>
            </div>
        </div>
    </div>
</div>`;

export default class BulkActionsDialog extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$includeDescendants = this.$widget.find(".include-descendants");
        this.$includeDescendants.on("change", () => this.refresh());

        this.$affectedNoteCount = this.$widget.find(".affected-note-count");

        this.$availableActionList = this.$widget.find(".bulk-available-action-list");
        this.$existingActionList = this.$widget.find(".bulk-existing-action-list");

        this.$widget.on('click', '[data-action-add]', async event => {
            const actionName = $(event.target).attr('data-action-add');

            await bulkActionService.addAction('_bulkAction', actionName);

            await this.refresh();
        });

        this.$executeButton = this.$widget.find(".execute-bulk-actions");
        this.$executeButton.on("click", async () => {
            await server.post("bulk-action/execute", {
                noteIds: this.selectedOrActiveNoteIds,
                includeDescendants: this.$includeDescendants.is(":checked")
            });

            toastService.showMessage(t('bulk_actions.bulk_actions_executed'), 3000);

            utils.closeActiveDialog();
        });
    }

    async refresh() {
        this.renderAvailableActions();

        const {affectedNoteCount} = await server.post('bulk-action/affected-notes', {
            noteIds: this.selectedOrActiveNoteIds,
            includeDescendants: this.$includeDescendants.is(":checked")
        });

        this.$affectedNoteCount.text(affectedNoteCount);

        const bulkActionNote = await froca.getNote('_bulkAction');

        const actions = bulkActionService.parseActions(bulkActionNote);

        this.$existingActionList.empty();

        if (actions.length > 0) {
            this.$existingActionList.append(...actions.map(action => action.render()));
        } else {
            this.$existingActionList.append($("<p>").text(t('bulk_actions.none_yet')))
        }
    }

    renderAvailableActions() {
        this.$availableActionList.empty();

        for (const actionGroup of bulkActionService.ACTION_GROUPS) {
            const $actionGroupList = $("<td>");
            const $actionGroup = $("<tr>")
                .append($("<td>").text(`${actionGroup.title}: `))
                .append($actionGroupList);

            for (const action of actionGroup.actions) {
                $actionGroupList.append(
                    $('<button class="btn btn-sm">')
                        .attr('data-action-add', action.actionName)
                        .text(action.actionTitle)
                );
            }

            this.$availableActionList.append($actionGroup);
        }
    }

    entitiesReloadedEvent({loadResults}) {
        // only refreshing deleted attrs, otherwise components update themselves
        if (loadResults.getAttributeRows().find(row =>
            row.type === 'label'
            && row.name === 'action'
            && row.noteId === '_bulkAction'
            && row.isDeleted)) {

            // this may be triggered from e.g., sync without open widget, then no need to refresh the widget
            if (this.selectedOrActiveNoteIds && this.$widget.is(":visible")) {
                this.refresh();
            }
        }
    }

    async openBulkActionsDialogEvent({selectedOrActiveNoteIds}) {
        this.selectedOrActiveNoteIds = selectedOrActiveNoteIds;
        this.$includeDescendants.prop("checked", false);

        await this.refresh();

        utils.openDialog(this.$widget);
    }
}
