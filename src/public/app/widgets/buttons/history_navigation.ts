import utils from "../../services/utils.js";
import contextMenu from "../../menus/context_menu.js";
import treeService from "../../services/tree.js";
import ButtonFromNoteWidget from "./button_from_note.js";
import type FNote from "../../entities/fnote.js";
import type { CommandNames } from "../../components/app_context.js";

interface WebContents {
    history: string[];
    getActiveIndex(): number;
    clearHistory(): void;
    canGoBack(): boolean;
    canGoForward(): boolean;
    goToIndex(index: string): void;
}

interface ContextMenuItem {
    title: string;
    idx: string;
    uiIcon: string;
}

export default class HistoryNavigationButton extends ButtonFromNoteWidget {
    private webContents?: WebContents;

    constructor(launcherNote: FNote, command: string) {
        super();

        this.title(() => launcherNote.title)
            .icon(() => launcherNote.getIcon())
            .command(() => command as CommandNames)
            .titlePlacement("right")
            .buttonNoteIdProvider(() => launcherNote.noteId)
            .onContextMenu((e) => { if (e) this.showContextMenu(e); })
            .class("launcher-button");
    }

    doRender() {
        super.doRender();

        if (utils.isElectron()) {
            this.webContents = utils.dynamicRequire("@electron/remote").getCurrentWebContents();

            // without this, the history is preserved across frontend reloads
            this.webContents?.clearHistory();

            this.refresh();
        }
    }

    async showContextMenu(e: JQuery.ContextMenuEvent) {
        e.preventDefault();

        if (!this.webContents || this.webContents.history.length < 2) {
            return;
        }

        let items: ContextMenuItem[] = [];

        const activeIndex = this.webContents.getActiveIndex();
        const history = this.webContents.history;

        for (const idx in history) {
            const url = history[idx];
            const parts = url.split("#");
            if (parts.length < 2) continue;

            const notePathWithTab = parts[1];
            const notePath = notePathWithTab.split("-")[0];

            const title = await treeService.getNotePathTitle(notePath);

            items.push({
                title,
                idx,
                uiIcon:
                    parseInt(idx) === activeIndex
                        ? "bx bx-radio-circle-marked" // compare with type coercion!
                        : parseInt(idx) < activeIndex
                          ? "bx bx-left-arrow-alt"
                          : "bx bx-right-arrow-alt"
            });
        }

        items.reverse();

        if (items.length > 20) {
            items = items.slice(0, 50);
        }

        contextMenu.show({
            x: e.pageX,
            y: e.pageY,
            items,
            selectMenuItemHandler: (item: any) => {
                if (item && item.idx && this.webContents) {
                    this.webContents.goToIndex(item.idx);
                }
            }
        });
    }

    activeNoteChangedEvent() {
        this.refresh();
    }
}
