import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("sync.title")}</h4>
    <button class="force-full-sync-button btn">${t("sync.force_full_sync_button")}</button> 
    
    <button class="fill-entity-changes-button btn">${t("sync.fill_entity_changes_button")}</button>
</div>`;

export default class AdvancedSyncOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$forceFullSyncButton = this.$widget.find(".force-full-sync-button");
        this.$fillEntityChangesButton = this.$widget.find(".fill-entity-changes-button");
        this.$forceFullSyncButton.on('click', async () => {
            await server.post('sync/force-full-sync');

            toastService.showMessage(t("sync.full_sync_triggered"));
        });

        this.$fillEntityChangesButton.on('click', async () => {
            toastService.showMessage(t("sync.filling_entity_changes"));

            await server.post('sync/fill-entity-changes');

            toastService.showMessage(t("sync.sync_rows_filled_successfully"));
        });
    }

    async optionsLoaded(options) {

    }
}
