import appContext, { type EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import type { NoteType } from "../../entities/fnote.js";
import { t } from "../../services/i18n.js";
import type { ViewScope } from "../../services/link.js";
import type { ViewTypeOptions } from "../../services/note_list_renderer.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = `
<button class="open-contextual-help-button" title="${t("help-button.title")}">
    <span class="bx bx-help-circle"></span>
</button>
`;

export const byNoteType: Record<Exclude<NoteType, "book">, string | null> = {
    canvas: null,
    code: null,
    contentWidget: null,
    doc: null,
    file: null,
    geoMap: "81SGnPGMk7Xc",
    image: null,
    launcher: null,
    mermaid: null,
    mindMap: null,
    noteMap: null,
    relationMap: null,
    render: null,
    search: null,
    text: null,
    webView: null,
    aiChat: null
};

export const byBookType: Record<ViewTypeOptions, string | null> = {
    list: null,
    grid: null,
    calendar: "xWbu3jpNWapp"
};

export default class ContextualHelpButton extends NoteContextAwareWidget {

    isEnabled() {
        if (!super.isEnabled()) {
            return false;
        }

        return !!ContextualHelpButton.#getUrlToOpen(this.note);
    }

    doRender() {
        this.$widget = $(TPL);
    }

    static #getUrlToOpen(note: FNote | null | undefined) {
        if (note && note.type !== "book" && byNoteType[note.type]) {
            return byNoteType[note.type];
        } else if (note && note.type === "book") {
            return byBookType[note.getAttributeValue("label", "viewType") as ViewTypeOptions ?? ""]
        }
    }

    async refreshWithNote(note: FNote | null | undefined): Promise<void> {
        this.$widget.attr("data-in-app-help", ContextualHelpButton.#getUrlToOpen(this.note) ?? "");
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (this.note?.type === "book" && loadResults.getAttributeRows().find((attr) => attr.noteId === this.noteId && attr.name === "viewType")) {
            this.refresh();
        }
    }

}
