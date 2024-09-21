import SwitchWidget from "./switch.js";
import server from "../services/server.js";
import toastService from "../services/toast.js";
import { t } from "../services/i18n.js";

export default class BookmarkSwitchWidget extends SwitchWidget {
    isEnabled() {
        return super.isEnabled()
            // it's not possible to bookmark root because that would clone it under bookmarks and thus create a cycle
            && !['root', '_hidden'].includes(this.noteId);
    }

    doRender() {
        super.doRender();

        this.$switchOnName.text(t("bookmark_switch.bookmark"));
        this.$switchOnButton.attr("title", t("bookmark_switch.bookmark_this_note"));

        this.$switchOffName.text(t("bookmark_switch.bookmark"));
        this.$switchOffButton.attr("title", t("bookmark_switch.remove_bookmark"));
    }

    async toggle(state) {
        const resp = await server.put(`notes/${this.noteId}/toggle-in-parent/_lbBookmarks/${!!state}`);

        if (!resp.success) {
            toastService.showError(resp.message);
        }
    }

    async refreshWithNote(note) {
        const isBookmarked = !!note.getParentBranches().find(b => b.parentNoteId === '_lbBookmarks');

        this.$switchOn.toggle(!isBookmarked);
        this.$switchOff.toggle(isBookmarked);
    }

    entitiesReloadedEvent({loadResults}) {
        if (loadResults.getBranchRows().find(b => b.noteId === this.noteId)) {
            this.refresh();
        }
    }
}
