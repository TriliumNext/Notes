import FlexContainer from "./containers/flex_container.js";
import utils from "../services/utils.js";
import attributeService from "../services/attributes.js";
import type BasicWidget from "./basic_widget.js";
import type { EventData } from "../components/app_context.js";
import type NoteContext from "../components/note_context.js";
import type FNote from "../entities/fnote.js";

export default class NoteWrapperWidget extends FlexContainer<BasicWidget> {

    private noteContext?: NoteContext;

    constructor() {
        super("column");

        this.css("flex-grow", "1").collapsible();
    }

    setNoteContextEvent({ noteContext }: EventData<"setNoteContext">) {
        this.noteContext = noteContext;

        this.refresh();
    }

    noteSwitchedAndActivatedEvent() {
        this.refresh();
    }

    noteSwitchedEvent() {
        this.refresh();
    }

    activeContextChangedEvent() {
        this.refresh();
    }

    refresh() {
        const isHiddenExt = this.isHiddenExt(); // preserve through class reset

        this.$widget.removeClass();

        this.toggleExt(!isHiddenExt);

        this.$widget.addClass("component note-split");

        const note = this.noteContext?.note;
        if (!note) {
            return;
        }

        this.$widget.toggleClass("full-content-width", this.#isFullWidthNote(note));

        this.$widget.addClass(note.getCssClass());

        this.$widget.addClass(utils.getNoteTypeClass(note.type));
        this.$widget.addClass(utils.getMimeTypeClass(note.mime));

        this.$widget.toggleClass("protected", note.isProtected);
    }

    #isFullWidthNote(note: FNote) {
        if (["image", "mermaid", "book", "render", "canvas", "webView", "mindMap", "geoMap"].includes(note.type)) {
            return true;
        }

        if (note.type === "file" && note.mime === "application/pdf") {
            return true;
        }

        return !!note?.isLabelTruthy("fullContentWidth");
    }

    async entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        // listening on changes of note.type and CSS class

        const noteId = this.noteContext?.noteId;
        if (
            loadResults.isNoteReloaded(noteId) ||
            loadResults.getAttributeRows().find((attr) => attr.type === "label" && attr.name === "cssClass" && attributeService.isAffecting(attr, this.noteContext?.note))
        ) {
            this.refresh();
        }
    }
}
