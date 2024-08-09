import OptionsWidget from "../options_widget.js";
import toastService from "../../../../services/toast.js";
import server from "../../../../services/server.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("database_integrity_check.title")}</h4>
    
    <p>${t("database_integrity_check.description")}</p>
    
    <button class="check-integrity-button btn">${t("database_integrity_check.check_button")}</button>
</div>`;

export default class DatabaseIntegrityCheckOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$checkIntegrityButton = this.$widget.find(".check-integrity-button");
        this.$checkIntegrityButton.on('click', async () => {
            toastService.showMessage(t("database_integrity_check.checking_integrity"));

            const {results} = await server.get('database/check-integrity');

            if (results.length === 1 && results[0].integrity_check === "ok") {
                toastService.showMessage(t("database_integrity_check.integrity_check_succeeded"));
            }
            else {
                toastService.showMessage(t("database_integrity_check.integrity_check_failed", { results: JSON.stringify(results, null, 2) }), 15000);
            }
        });
    }
}
