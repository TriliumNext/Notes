import { formatDateTime } from "../../utils/formatters.js";
import { t } from "../../services/i18n.js";
import BasicWidget from "../basic_widget.js";
import openService from "../../services/open.js";
import server from "../../services/server.js";
import utils from "../../services/utils.js";

interface AppInfo {
    appVersion: string;
    dbVersion: number;
    syncVersion: number;
    buildDate: string;
    buildRevision: string;
    dataDirectory: string;
}

const TPL = `
<div class="about-dialog modal fade mx-auto" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">${t("about.title")}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t("about.close")}"></button>
            </div>
            <div class="modal-body">
                <table class="table table-borderless">
                    <tr>
                        <th>${t("about.homepage")}</th>
                        <td><a class="tn-link" href="https://github.com/TriliumNext/Notes" class="external">https://github.com/TriliumNext/Notes</a></td>
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
                        <td><a class="tn-link build-revision external" href="" target="_blank"></a></td>
                    </tr>
                    <tr>
                        <th>${t("about.data_directory")}</th>
                        <td class="data-directory"></td>
                    </tr>
                </table>
            </div>
        </div>
    </div>
</div>

<style>
.about-dialog a {
    word-break: break-all;
}
</style>
`;

export default class AboutDialog extends BasicWidget {
    private $appVersion!: JQuery<HTMLElement>;
    private $dbVersion!: JQuery<HTMLElement>;
    private $syncVersion!: JQuery<HTMLElement>;
    private $buildDate!: JQuery<HTMLElement>;
    private $buildRevision!: JQuery<HTMLElement>;
    private $dataDirectory!: JQuery<HTMLElement>;

    doRender(): void {
        this.$widget = $(TPL);
        this.$appVersion = this.$widget.find(".app-version");
        this.$dbVersion = this.$widget.find(".db-version");
        this.$syncVersion = this.$widget.find(".sync-version");
        this.$buildDate = this.$widget.find(".build-date");
        this.$buildRevision = this.$widget.find(".build-revision");
        this.$dataDirectory = this.$widget.find(".data-directory");
    }

    async refresh() {
        const appInfo = await server.get<AppInfo>("app-info");

        this.$appVersion.text(appInfo.appVersion);
        this.$dbVersion.text(appInfo.dbVersion.toString());
        this.$syncVersion.text(appInfo.syncVersion.toString());
        this.$buildDate.text(formatDateTime(appInfo.buildDate));
        this.$buildRevision.text(appInfo.buildRevision);
        this.$buildRevision.attr("href", `https://github.com/TriliumNext/Notes/commit/${appInfo.buildRevision}`);
        if (utils.isElectron()) {
            this.$dataDirectory.html(
                $("<a></a>", {
                    href: "#",
                    class: "tn-link",
                    text: appInfo.dataDirectory
                }).prop("outerHTML")
            );
            this.$dataDirectory.find("a").on("click", (event: JQuery.ClickEvent) => {
                event.preventDefault();
                openService.openDirectory(appInfo.dataDirectory);
            });
        } else {
            this.$dataDirectory.text(appInfo.dataDirectory);
        }
    }

    async openAboutDialogEvent() {
        await this.refresh();
        utils.openDialog(this.$widget);
    }
}
