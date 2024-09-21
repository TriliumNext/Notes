import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";
import OptionsWidget from "./options_widget.js";
import { t } from "../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4 style="margin-top: 0px;">${t('sync_2.config_title')}</h4>
    
    <form class="sync-setup-form">
        <div class="form-group">
            <label>${t('sync_2.server_address')}</label>
            <input class="sync-server-host form-control" placeholder="https://<host>:<port>">
        </div>
    
        <div class="form-group">
            <label>${t('sync_2.timeout')}</label>
            <input class="sync-server-timeout form-control" min="1" max="10000000" type="number" style="text-align: left;">
        </div>
    
        <div class="form-group">
            <label>${t('sync_2.proxy_label')}</label>
            <input class="sync-proxy form-control" placeholder="https://<host>:<port>">
    
            <p><strong>${t('sync_2.note')}:</strong> ${t('sync_2.note_description')}</p>
            <p>${t('sync_2.special_value_description')}</p>
        </div>
    
        <div style="display: flex; justify-content: space-between;">
            <button class="btn btn-primary">${t('sync_2.save')}</button>
    
            <button class="btn" type="button" data-help-page="synchronization.html">${t('sync_2.help')}</button>
        </div>
    </form>
</div>

<div class="options-section">
    <h4>${t('sync_2.test_title')}</h4>
    
    <p>${t('sync_2.test_description')}</p>
    
    <button class="test-sync-button btn">${t('sync_2.test_button')}</button>
</div>`;

export default class SyncOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$form = this.$widget.find(".sync-setup-form");
        this.$syncServerHost = this.$widget.find(".sync-server-host");
        this.$syncServerTimeout = this.$widget.find(".sync-server-timeout");
        this.$syncProxy = this.$widget.find(".sync-proxy");
        this.$testSyncButton = this.$widget.find(".test-sync-button");

        this.$form.on('submit', () => this.save());

        this.$testSyncButton.on('click', async () => {
            const result = await server.post('sync/test');

            if (result.success) {
                toastService.showMessage(result.message);
            } else {
                toastService.showError(t('sync_2.handshake_failed', { message: result.message }));
            }
        });
    }

    optionsLoaded(options) {
        this.$syncServerHost.val(options.syncServerHost);
        this.$syncServerTimeout.val(options.syncServerTimeout);
        this.$syncProxy.val(options.syncProxy);
    }

    save() {
        this.updateMultipleOptions({
            'syncServerHost': this.$syncServerHost.val(),
            'syncServerTimeout': this.$syncServerTimeout.val(),
            'syncProxy': this.$syncProxy.val()
        });

        return false;
    }
}
