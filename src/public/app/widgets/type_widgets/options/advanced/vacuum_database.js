import OptionsWidget from "../options_widget.js";
import toastService from "../../../../services/toast.js";
import server from "../../../../services/server.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("vacuum_database.title")}</h4>
    
    <p>${t("vacuum_database.description")}</p>
    
    <button class="vacuum-database-button btn">${t("vacuum_database.button_text")}</button>
</div>`;

export default class VacuumDatabaseOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$vacuumDatabaseButton = this.$widget.find(".vacuum-database-button");
        this.$vacuumDatabaseButton.on('click', async () => {
            toastService.showMessage(t("vacuum_database.vacuuming_database"));

            await server.post('database/vacuum-database');

            toastService.showMessage(t("vacuum_database.database_vacuumed"));
        });
    }
}
