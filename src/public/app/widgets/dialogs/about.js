import server from "../../services/server.js";
import utils from "../../services/utils.js";
import { t } from "../../services/i18n.js";
import BasicWidget from "../basic_widget.js";
import openService from "../../services/open.js";


const TPL = `
<div class="about-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("about.title")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <table class="table table-borderless text-nowrap">
                    <tr>
                        <th>${t("about.homepage")}</th>
                        <td><a href="https://github.com/TriliumNext/Notes" class="external">https://github.com/TriliumNext/Notes</a></td>
                    </tr>
                    <tr>
                        <th>${t("about.app_version")}</th>
                        <td class="app-version"></td>
                    </tr>
                    <tr>
                        <th>${t("about.db_version")}</th>
                        <td class="db-version"></td>
                    </tr>
                    <tr>
                        <th>${t("about.sync_version")}</th>
                        <td class="sync-version"></td>
                    </tr>
                    <tr>
                        <th>${t("about.build_date")}</th>
                        <td class="build-date"></td>
                    </tr>

                    <tr>
                        <th>${t("about.build_revision")}</th>
                        <td><a href="" class="build-revision external" target="_blank"></a></td>
                    </tr>

                    <tr>
                        <th>${t("about.data_directory")}</th>
                        <td class="data-directory"></td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>`;

export default class AboutDialog extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$appVersion = this.$widget.find(".app-version");
        this.$dbVersion = this.$widget.find(".db-version");
        this.$syncVersion = this.$widget.find(".sync-version");
        this.$buildDate = this.$widget.find(".build-date");
        this.$buildRevision = this.$widget.find(".build-revision");
        this.$dataDirectory = this.$widget.find(".data-directory");
    }

    async refresh() {
        const appInfo = await server.get('app-info');

        this.$appVersion.text(appInfo.appVersion);
        this.$dbVersion.text(appInfo.dbVersion);
        this.$syncVersion.text(appInfo.syncVersion);
        this.$buildDate.text(appInfo.buildDate);
        this.$buildRevision.text(appInfo.buildRevision);
        this.$buildRevision.attr('href', `https://github.com/TriliumNext/Notes/commit/${appInfo.buildRevision}`);
        if (utils.isElectron()) {
            this.$dataDirectory.html($('<a></a>', {
                href: '#',
                text: appInfo.dataDirectory,
            }));
            this.$dataDirectory.find("a").on('click', (event) => {
                event.preventDefault();
                openService.openDirectory(appInfo.dataDirectory);
            })
        } else {
            this.$dataDirectory.text(appInfo.dataDirectory);
        }
    }

    async openAboutDialogEvent() {
        await this.refresh();

        utils.openDialog(this.$widget);
    }
}
