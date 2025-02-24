import OptionsWidget from "../options_widget.js";
import toastService from "../../../../services/toast.js";
import server from "../../../../services/server.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("database_anonymization.title")}</h4>

    <div class="row">
        <p>${t("database_anonymization.choose_anonymization")}</p>

        <div class="col-md-6">
            <h5>${t("database_anonymization.full_anonymization")}</h5>

            <p>${t("database_anonymization.full_anonymization_description")}</p>
            <button class="anonymize-full-button btn btn-secondary">${t("database_anonymization.save_fully_anonymized_database")}</button>
        </div>

        <div class="col-md-6">
            <h5>${t("database_anonymization.light_anonymization")}</h5>

            <p>${t("database_anonymization.light_anonymization_description")}</p>

            <button class="anonymize-light-button btn btn-secondary">${t("database_anonymization.save_lightly_anonymized_database")}</button>
        </div>
    </div>

    <hr />

    <h5>${t("database_anonymization.existing_anonymized_databases")}</h5>

    <ul class="existing-anonymized-databases"></ul>
</div>`;

// TODO: Deduplicate with server
interface AnonymizeResponse {
    success: boolean;
    anonymizedFilePath: string;
}

interface AnonymizedDbResponse {
    filePath: string;
}

export default class DatabaseAnonymizationOptions extends OptionsWidget {

    private $anonymizeFullButton!: JQuery<HTMLElement>;
    private $anonymizeLightButton!: JQuery<HTMLElement>;
    private $existingAnonymizedDatabases!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$anonymizeFullButton = this.$widget.find(".anonymize-full-button");
        this.$anonymizeLightButton = this.$widget.find(".anonymize-light-button");
        this.$anonymizeFullButton.on("click", async () => {
            toastService.showMessage(t("database_anonymization.creating_fully_anonymized_database"));

            const resp = await server.post<AnonymizeResponse>("database/anonymize/full");

            if (!resp.success) {
                toastService.showError(t("database_anonymization.error_creating_anonymized_database"));
            } else {
                toastService.showMessage(t("database_anonymization.successfully_created_fully_anonymized_database", { anonymizedFilePath: resp.anonymizedFilePath }), 10000);
            }

            this.refresh();
        });

        this.$anonymizeLightButton.on("click", async () => {
            toastService.showMessage(t("database_anonymization.creating_lightly_anonymized_database"));

            const resp = await server.post<AnonymizeResponse>("database/anonymize/light");

            if (!resp.success) {
                toastService.showError(t("database_anonymization.error_creating_anonymized_database"));
            } else {
                toastService.showMessage(t("database_anonymization.successfully_created_lightly_anonymized_database", { anonymizedFilePath: resp.anonymizedFilePath }), 10000);
            }

            this.refresh();
        });

        this.$existingAnonymizedDatabases = this.$widget.find(".existing-anonymized-databases");
    }

    optionsLoaded(options: OptionMap) {
        server.get<AnonymizedDbResponse[]>("database/anonymized-databases").then((anonymizedDatabases) => {
            this.$existingAnonymizedDatabases.empty();

            if (!anonymizedDatabases.length) {
                anonymizedDatabases = [{ filePath: t("database_anonymization.no_anonymized_database_yet") }];
            }

            for (const { filePath } of anonymizedDatabases) {
                this.$existingAnonymizedDatabases.append($("<li>").text(filePath));
            }
        });
    }
}
