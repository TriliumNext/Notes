import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("revisions_snapshot_limit.note_revisions_snapshot_limit_title")}</h4>

    <p>${t("revisions_snapshot_limit.note_revisions_snapshot_limit_description")}</p>

    <div class="form-group">
        <label>${t("revisions_snapshot_limit.snapshot_number_limit_label")}</label>
        <input class="revision-snapshot-number-limit form-control options-number-input" type="number" min="-1">
    </div>

    <button class="erase-excess-revision-snapshots-now-button btn btn-sm">
                    ${t("revisions_snapshot_limit.erase_excess_revision_snapshots")}</button>
</div>`;

export default class RevisionSnapshotsLimitOptions extends OptionsWidget {

    private $revisionSnapshotsNumberLimit!: JQuery<HTMLElement>;
    private $eraseExcessRevisionSnapshotsButton!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$revisionSnapshotsNumberLimit = this.$widget.find(".revision-snapshot-number-limit");
        this.$revisionSnapshotsNumberLimit.on("change", () => {
            let revisionSnapshotNumberLimit = parseInt(String(this.$revisionSnapshotsNumberLimit.val()), 10);
            if (!isNaN(revisionSnapshotNumberLimit) && revisionSnapshotNumberLimit >= -1) {
                this.updateOption("revisionSnapshotNumberLimit", revisionSnapshotNumberLimit);
            }
        });
        this.$eraseExcessRevisionSnapshotsButton = this.$widget.find(".erase-excess-revision-snapshots-now-button");
        this.$eraseExcessRevisionSnapshotsButton.on("click", () => {
            server.post("revisions/erase-all-excess-revisions").then(() => {
                toastService.showMessage(t("revisions_snapshot_limit.erase_excess_revision_snapshots_prompt"));
            });
        });
    }

    async optionsLoaded(options: OptionMap) {
        this.$revisionSnapshotsNumberLimit.val(options.revisionSnapshotNumberLimit);
    }
}
