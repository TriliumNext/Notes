import SwitchWidget from "./switch.js";
import server from "../services/server.js";
import toastService from "../services/toast.js";
import { t } from "../services/i18n.js";
import type FNote from "../entities/fnote.js";
import type { EventData } from "../components/app_context.js";

// TODO: Deduplicate
type Response = {
    success: true;
} | {
    success: false;
    message: string;
}

export default class BookmarkSwitchWidget extends SwitchWidget {
    isEnabled() {
        return (
            super.isEnabled() &&
            // it's not possible to bookmark root because that would clone it under bookmarks and thus create a cycle
            !["root", "_hidden"].includes(this.noteId ?? "")
        );
    }

    doRender() {
        super.doRender();

        this.switchOnName = t("bookmark_switch.bookmark");
        this.switchOnTooltip = t("bookmark_switch.bookmark_this_note");

        this.switchOffName = t("bookmark_switch.bookmark");
        this.switchOffTooltip = t("bookmark_switch.remove_bookmark");
    }

    async toggle(state: boolean | null | undefined) {
        const resp = await server.put<Response>(`notes/${this.noteId}/toggle-in-parent/_lbBookmarks/${!!state}`);

        if (!resp.success && "message" in resp) {
            toastService.showError(resp.message);
        }
    }

    async refreshWithNote(note: FNote) {
        const isBookmarked = !!note.getParentBranches().find((b) => b.parentNoteId === "_lbBookmarks");

        this.isToggled = isBookmarked;
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.getBranchRows().find((b) => b.noteId === this.noteId)) {
            this.refresh();
        }
    }
}
