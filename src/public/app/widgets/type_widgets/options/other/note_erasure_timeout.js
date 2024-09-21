import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import { t } from "../../../../services/i18n.js";

const TPL = `
<div class="options-section">
    <h4>${t("note_erasure_timeout.note_erasure_timeout_title")}</h4>

    <p>${t("note_erasure_timeout.note_erasure_description")}</p>

    <div class="form-group">
        <label>${t("note_erasure_timeout.erase_notes_after_x_seconds")}</label>
        <input class="erase-entities-after-time-in-seconds form-control options-number-input" type="number" min="0">
    </div>
    
    <p>${t("note_erasure_timeout.manual_erasing_description")}</p>
    
    <button class="erase-deleted-notes-now-button btn">${t("note_erasure_timeout.erase_deleted_notes_now")}</button>
</div>`;

export default class NoteErasureTimeoutOptions extends OptionsWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$eraseEntitiesAfterTimeInSeconds = this.$widget.find(".erase-entities-after-time-in-seconds");
        this.$eraseEntitiesAfterTimeInSeconds.on('change', () => this.updateOption('eraseEntitiesAfterTimeInSeconds', this.$eraseEntitiesAfterTimeInSeconds.val()));

        this.$eraseDeletedNotesButton = this.$widget.find(".erase-deleted-notes-now-button");
        this.$eraseDeletedNotesButton.on('click', () => {
            server.post('notes/erase-deleted-notes-now').then(() => {
                toastService.showMessage(t("note_erasure_timeout.deleted_notes_erased"));
            });
        });
    }

    async optionsLoaded(options) {
        this.$eraseEntitiesAfterTimeInSeconds.val(options.eraseEntitiesAfterTimeInSeconds);
    }
}
