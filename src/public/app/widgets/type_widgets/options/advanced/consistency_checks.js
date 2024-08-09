import OptionsWidget from "../options_widget.js";
import toastService from "../../../../services/toast.js";
import server from "../../../../services/server.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("consistency_checks.title")}</h4>
    
    <button class="find-and-fix-consistency-issues-button btn">${t("consistency_checks.find_and_fix_button")}</button>
</div>`;

export default class ConsistencyChecksOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$findAndFixConsistencyIssuesButton = this.$widget.find(".find-and-fix-consistency-issues-button");
        this.$findAndFixConsistencyIssuesButton.on('click', async () => {
            toastService.showMessage(t("consistency_checks.finding_and_fixing_message"));

            await server.post('database/find-and-fix-consistency-issues');

            toastService.showMessage(t("consistency_checks.issues_fixed_message"));
        });
    }
}
