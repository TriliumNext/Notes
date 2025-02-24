import OptionsWidget from "../options_widget.js";
import toastService from "../../../../services/toast.js";
import server from "../../../../services/server.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("database_integrity_check.title")}</h4>

    <p>${t("database_integrity_check.description")}</p>

    <button class="check-integrity-button btn btn-secondary">${t("database_integrity_check.check_button")}</button>
    <button class="find-and-fix-consistency-issues-button btn btn-secondary">${t("consistency_checks.find_and_fix_button")}</button>
</div>
`;

// TODO: Deduplicate with server
interface Response {
    results: {
        integrity_check: string;
    }[];
}

export default class DatabaseIntegrityCheckOptions extends OptionsWidget {

    private $checkIntegrityButton!: JQuery<HTMLElement>;
    private $findAndFixConsistencyIssuesButton!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$checkIntegrityButton = this.$widget.find(".check-integrity-button");
        this.$checkIntegrityButton.on("click", async () => {
            toastService.showMessage(t("database_integrity_check.checking_integrity"));

            const { results } = await server.get<Response>("database/check-integrity");

            if (results.length === 1 && results[0].integrity_check === "ok") {
                toastService.showMessage(t("database_integrity_check.integrity_check_succeeded"));
            } else {
                toastService.showMessage(t("database_integrity_check.integrity_check_failed", { results: JSON.stringify(results, null, 2) }), 15000);
            }
        });

        this.$findAndFixConsistencyIssuesButton = this.$widget.find(".find-and-fix-consistency-issues-button");
        this.$findAndFixConsistencyIssuesButton.on("click", async () => {
            toastService.showMessage(t("consistency_checks.finding_and_fixing_message"));

            await server.post("database/find-and-fix-consistency-issues");

            toastService.showMessage(t("consistency_checks.issues_fixed_message"));
        });
    }
}
