import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("revisions_snapshot_interval.note_revisions_snapshot_interval_title")}</h4>

    <p>${t("revisions_snapshot_interval.note_revisions_snapshot_description")}</p>

    <div class="form-group">
        <label>${t("revisions_snapshot_interval.snapshot_time_interval_label")}</label>
        <input class="revision-snapshot-time-interval-in-seconds form-control options-number-input" type="number" min="10">
    </div>
</div>`;

export default class RevisionsSnapshotIntervalOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$revisionsTimeInterval = this.$widget.find(".revision-snapshot-time-interval-in-seconds");
        this.$revisionsTimeInterval.on('change', () =>
            this.updateOption('revisionSnapshotTimeInterval', this.$revisionsTimeInterval.val()));
    }

    async optionsLoaded(options) {
        this.$revisionsTimeInterval.val(options.revisionSnapshotTimeInterval);
    }
}
