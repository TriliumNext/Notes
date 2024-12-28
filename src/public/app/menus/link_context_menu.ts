import { t } from "../services/i18n.js";
import contextMenu from "./context_menu.js";
import appContext from "../components/app_context.js";
import { ViewScope } from "../services/link.js";

function openContextMenu(notePath: string, e: PointerEvent, viewScope: ViewScope = {}, hoistedNoteId: string | null = null) {
    contextMenu.show({
        x: e.pageX,
        y: e.pageY,
        items: [
            {title: t("link_context_menu.open_note_in_new_tab"), command: "openNoteInNewTab", uiIcon: "bx bx-link-external"},
            {title: t("link_context_menu.open_note_in_new_split"), command: "openNoteInNewSplit", uiIcon: "bx bx-dock-right"},
            {title: t("link_context_menu.open_note_in_new_window"), command: "openNoteInNewWindow", uiIcon: "bx bx-window-open"}
        ],
        selectMenuItemHandler: ({command}) => {
            if (!hoistedNoteId) {
                hoistedNoteId = appContext.tabManager.getActiveContext().hoistedNoteId;
            }

            if (command === 'openNoteInNewTab') {
                appContext.tabManager.openContextWithNote(notePath, { hoistedNoteId, viewScope });
            }
            else if (command === 'openNoteInNewSplit') {
                const subContexts = appContext.tabManager.getActiveContext().getSubContexts();
                const {ntxId} = subContexts[subContexts.length - 1];

                appContext.triggerCommand("openNewNoteSplit", {ntxId, notePath, hoistedNoteId, viewScope});
            }
            else if (command === 'openNoteInNewWindow') {
                appContext.triggerCommand('openInWindow', {notePath, hoistedNoteId, viewScope});
            }
        }
    });
}

export default {
    openContextMenu
}
