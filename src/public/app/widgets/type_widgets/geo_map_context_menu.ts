import appContext from "../../components/app_context.js";
import type { ContextMenuEvent } from "../../menus/context_menu.js";
import contextMenu from "../../menus/context_menu.js";
import linkContextMenu from "../../menus/link_context_menu.js";
import { t } from "../../services/i18n.js";

export default function openContextMenu(noteId: string, e: ContextMenuEvent) {
    contextMenu.show({
        x: e.pageX,
        y: e.pageY,
        items: [
            ...linkContextMenu.getItems(),
            { title: t("geo-map-context.open-location"), command: "openGeoLocation", uiIcon: "bx bx-map-alt" },
            { title: "----" },
            { title: t("geo-map-context.remove-from-map"), command: "deleteFromMap", uiIcon: "bx bx-trash" }
        ],
        selectMenuItemHandler: ({ command }, e) => {
            if (command === "deleteFromMap") {
                appContext.triggerCommand(command, { noteId });
                return;
            }

            if (command === "openGeoLocation") {
                appContext.triggerCommand(command, { noteId, event: e });
                return;
            }

            // Pass the events to the link context menu
            linkContextMenu.handleLinkContextMenuItem(command, noteId);
        }
    });
}
