import { t } from "../../services/i18n.js";
import linkService from "../../services/link.js";
import server from "../../services/server.js";
import froca from "../../services/froca.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";
import type FNote from "../../entities/fnote.js";
import type { EventData } from "../../components/app_context.js";

const TPL = /*html*/`
<div class="similar-notes-widget">
    <style>
    .similar-notes-wrapper {
        max-height: 200px;
        overflow: auto;
        padding: 12px;
    }

    .similar-notes-wrapper a {
        display: inline-block;
        border: 1px dotted var(--main-border-color);
        border-radius: 20px;
        background-color: var(--accented-background-color);
        padding: 0 10px 0 10px;
        margin: 0 3px 0 3px;
        max-width: 10em;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
    </style>

    <div class="similar-notes-wrapper"></div>
</div>
`;

// TODO: Deduplicate with server
interface SimilarNote {
    score: number;
    notePath: string[];
    noteId: string;
}

export default class SimilarNotesWidget extends NoteContextAwareWidget {

    private $similarNotesWrapper!: JQuery<HTMLElement>;
    private title?: string;
    private rendered?: boolean;

    get name() {
        return "similarNotes";
    }

    get toggleCommand() {
        return "toggleRibbonTabSimilarNotes";
    }

    isEnabled() {
        return super.isEnabled() && this.note?.type !== "search" && !this.note?.isLabelTruthy("similarNotesWidgetDisabled");
    }

    getTitle() {
        return {
            show: this.isEnabled(),
            title: t("similar_notes.title"),
            icon: "bx bx-bar-chart"
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$similarNotesWrapper = this.$widget.find(".similar-notes-wrapper");
    }

    async refreshWithNote(note: FNote) {
        if (!this.note) {
            return;
        }

        // remember which title was when we found the similar notes
        this.title = this.note.title;

        const similarNotes = await server.get<SimilarNote[]>(`similar-notes/${this.noteId}`);

        if (similarNotes.length === 0) {
            this.$similarNotesWrapper.empty().append(t("similar_notes.no_similar_notes_found"));

            return;
        }

        const noteIds = similarNotes.flatMap((note) => note.notePath);

        await froca.getNotes(noteIds, true); // preload all at once

        const $list = $("<div>");

        for (const similarNote of similarNotes) {
            const note = await froca.getNote(similarNote.noteId, true);

            if (!note) {
                continue;
            }

            const $item = (await linkService.createLink(similarNote.notePath.join("/"))).css("font-size", 24 * (1 - 1 / (1 + similarNote.score)));

            $list.append($item);
        }

        this.$similarNotesWrapper.empty().append($list);
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (this.note && this.title !== this.note.title) {
            this.rendered = false;

            this.refresh();
        }
    }
}
