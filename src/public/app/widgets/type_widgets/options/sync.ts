import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";
import { t } from "../../../services/i18n.js";
import type { OptionMap } from "../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4 style="margin-top: 0px;">${t("sync_2.config_title")}</h4>

    <form class="sync-setup-form">
        <div class="form-group">
            <label for="sync-server-host" >${t("sync_2.server_address")}</label>
            <input id="sync-server-host" class="sync-server-host form-control" placeholder="https://<host>:<port>">
        </div>

        <div class="form-group">
            <label for="sync-server-timeout" >${t("sync_2.timeout")}</label>
            <input id="sync-server-timeout" class="sync-server-timeout form-control" min="1" max="10000000" type="number" style="text-align: left;">
        </div>

        <div class="form-group">
            <label for="sync-proxy form-control" >${t("sync_2.proxy_label")}</label>
            <input id="sync-proxy form-control" class="sync-proxy form-control" placeholder="https://<host>:<port>">

            <p><strong>${t("sync_2.note")}:</strong> ${t("sync_2.note_description")}</p>
            <p>${t("sync_2.special_value_description")}</p>
        </div>

        <div style="display: flex; justify-content: space-between;">
            <button class="btn btn-primary">${t("sync_2.save")}</button>

            <button class="btn btn-secondary" type="button" data-help-page="synchronization.html">${t("sync_2.help")}</button>
        </div>
    </form>
</div>

<div class="options-section">
    <h4>${t("sync_2.test_title")}</h4>

    <p>${t("sync_2.test_description")}</p>

    <button class="test-sync-button btn btn-secondary">${t("sync_2.test_button")}</button>
</div>`;

// TODO: Deduplicate
interface TestResponse {
    success: boolean;
    message: string;
}

export default class SyncOptions extends OptionsWidget {

    private $form!: JQuery<HTMLElement>;
    private $syncServerHost!: JQuery<HTMLElement>;
    private $syncServerTimeout!: JQuery<HTMLElement>;
    private $syncProxy!: JQuery<HTMLElement>;
    private $testSyncButton!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);

        this.$form = this.$widget.find(".sync-setup-form");
        this.$syncServerHost = this.$widget.find(".sync-server-host");
        this.$syncServerTimeout = this.$widget.find(".sync-server-timeout");
        this.$syncProxy = this.$widget.find(".sync-proxy");
        this.$testSyncButton = this.$widget.find(".test-sync-button");

        this.$form.on("submit", () => this.save());

        this.$testSyncButton.on("click", async () => {
            const result = await server.post<TestResponse>("sync/test");

            if (result.success) {
                toastService.showMessage(result.message);
            } else {
                toastService.showError(t("sync_2.handshake_failed", { message: result.message }));
            }
        });
    }

    optionsLoaded(options: OptionMap) {
        this.$syncServerHost.val(options.syncServerHost);
        this.$syncServerTimeout.val(options.syncServerTimeout);
        this.$syncProxy.val(options.syncProxy);
    }

    save() {
        this.updateMultipleOptions({
            syncServerHost: String(this.$syncServerHost.val()),
            syncServerTimeout: String(this.$syncServerTimeout.val()),
            syncProxy: String(this.$syncProxy.val())
        });

        return false;
    }
}
