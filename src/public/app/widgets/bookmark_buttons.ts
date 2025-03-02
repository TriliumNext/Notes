import FlexContainer from "./containers/flex_container.js";
import OpenNoteButtonWidget from "./buttons/open_note_button_widget.js";
import BookmarkFolderWidget from "./buttons/bookmark_folder.js";
import froca from "../services/froca.js";
import utils from "../services/utils.js";
import type { EventData } from "../components/app_context.js";
import type Component from "../components/component.js";

interface BookmarkButtonsSettings {
    titlePlacement?: string;
}

export default class BookmarkButtons extends FlexContainer<Component> {
    private settings: BookmarkButtonsSettings;
    private noteIds: string[];

    constructor(isHorizontalLayout: boolean) {
        super(isHorizontalLayout ? "row" : "column");

        this.contentSized();
        this.settings = {};
        this.noteIds = [];
    }

    async refresh(): Promise<void> {
        this.$widget.empty();
        this.children = [];
        this.noteIds = [];

        const bookmarkParentNote = await froca.getNote("_lbBookmarks");

        if (!bookmarkParentNote) {
            return;
        }

        for (const note of await bookmarkParentNote.getChildNotes()) {
            this.noteIds.push(note.noteId);

            let buttonWidget: OpenNoteButtonWidget | BookmarkFolderWidget = note.isLabelTruthy("bookmarkFolder")
                ? new BookmarkFolderWidget(note)
                : new OpenNoteButtonWidget(note).class("launcher-button");

            if (this.settings.titlePlacement) {
                if (!('settings' in buttonWidget)) {
                    (buttonWidget as any).settings = {};
                }

                (buttonWidget as any).settings.titlePlacement = this.settings.titlePlacement;
            }

            this.child(buttonWidget);

            this.$widget.append(buttonWidget.render());

            buttonWidget.refreshIcon();
        }

        utils.reloadTray();
    }

    initialRenderCompleteEvent(): void {
        this.refresh();
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">): void {
        if (loadResults.getBranchRows().find((branch) => branch.parentNoteId === "_lbBookmarks")) {
            this.refresh();
        }

        if (loadResults.getAttributeRows().find((attr) =>
            attr.type === "label" &&
            attr.name && ["iconClass", "workspaceIconClass", "bookmarkFolder"].includes(attr.name) &&
            attr.noteId && this.noteIds.includes(attr.noteId)
        )) {
            this.refresh();
        }
    }
}
