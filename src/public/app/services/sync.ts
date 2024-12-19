import { t } from './i18n.js';
import server from './server.js';
import toastService from "./toast.js";

// TODO: De-duplicate with server once we have a commons.
interface SyncResult {
    success: boolean;
    message: string;
    errorCode?: string;
}

async function syncNow(ignoreNotConfigured = false) {
    const result = await server.post<SyncResult>('sync/now');

    if (result.success) {
        toastService.showMessage(t("sync.finished-successfully"));
    }
    else {
        if (result.message.length > 200) {
            result.message = `${result.message.substr(0, 200)}...`;
        }

        if (!ignoreNotConfigured || result.errorCode !== 'NOT_CONFIGURED') {
            toastService.showError(t("sync.failed", { message: result.message }));
        }
    }
}

export default {
    syncNow
};
