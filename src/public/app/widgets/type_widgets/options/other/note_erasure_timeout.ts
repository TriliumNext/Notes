import OptionsWidget from "../options_widget.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";
import TimeSelector from "../time_selector.js";

const TPL = `
<div class="options-section">
    <h4>${t("note_erasure_timeout.note_erasure_timeout_title")}</h4>
    <p>${t("note_erasure_timeout.note_erasure_description")}</p>
`;

const TPL2 = `
    <p>${t("note_erasure_timeout.manual_erasing_description")}</p>
    <button id="erase-deleted-notes-now-button" class="btn btn-secondary">${t("note_erasure_timeout.erase_deleted_notes_now")}</button>
</div>`;

export default class NoteErasureTimeoutOptions extends TimeSelector {
    private $eraseDeletedNotesButton!: JQuery<HTMLButtonElement>;

    constructor() {
        super({
            widgetId: "erase-entities-after",
            widgetLabelId: "note_erasure_timeout.erase_notes_after",
            optionValueId: "eraseEntitiesAfterTimeInSeconds",
            optionTimeScaleId: "eraseEntitiesAfterTimeScale"
        });
        super.doRender();
    }

    doRender() {
        this.$widget = $(TPL).append(this.$widget).append(TPL2);

        this.$eraseDeletedNotesButton = this.$widget.find("#erase-deleted-notes-now-button");

        this.$eraseDeletedNotesButton.on("click", () => {
            server.post("notes/erase-deleted-notes-now").then(() => {
                toastService.showMessage(t("note_erasure_timeout.deleted_notes_erased"));
            });
        });
    }
}
