import { t } from "../services/i18n.js";
import protectedSessionService from "../services/protected_session.js";
import SwitchWidget from "./switch.js";

export default class ProtectedNoteSwitchWidget extends SwitchWidget {
    doRender() {
        super.doRender();

        this.$switchOnName.text(t("protect_note.toggle-on"));
        this.$switchOnButton.attr("title", t("protect_note.toggle-on-hint"));

        this.$switchOffName.text(t("protect_note.toggle-off"));
        this.$switchOffButton.attr("title", t("protect_note.toggle-off-hint"));
    }

    switchOn() {
        protectedSessionService.protectNote(this.noteId, true, false);
    }

    switchOff() {
        protectedSessionService.protectNote(this.noteId, false, false)
    }

    async refreshWithNote(note) {
        this.$switchOn.toggle(!note.isProtected);
        this.$switchOff.toggle(!!note.isProtected);
    }

    entitiesReloadedEvent({loadResults}) {
        if (loadResults.isNoteReloaded(this.noteId)) {
            this.refresh();
        }
    }
}
