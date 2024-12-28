import treeService, { Node } from '../services/tree.js';
import froca from "../services/froca.js";
import contextMenu, { MenuCommandItem, MenuItem } from "./context_menu.js";
import dialogService from "../services/dialog.js";
import server from "../services/server.js";
import { t } from '../services/i18n.js';
import type { SelectMenuItemEventListener } from '../components/events.js';
import NoteTreeWidget from '../widgets/note_tree.js';
import { FilteredCommandNames, ContextMenuCommandData } from '../components/app_context.js';

type LauncherCommandNames = FilteredCommandNames<ContextMenuCommandData>;

export default class LauncherContextMenu implements SelectMenuItemEventListener<LauncherCommandNames> {

    private treeWidget: NoteTreeWidget;
    private node: Node;

    constructor(treeWidget: NoteTreeWidget, node: Node) {
        this.treeWidget = treeWidget;
        this.node = node;
    }

    async show(e: PointerEvent) {
        contextMenu.show({
            x: e.pageX,
            y: e.pageY,
            items: await this.getMenuItems(),
            selectMenuItemHandler: (item, e) => this.selectMenuItemHandler(item)
        })
    }

    async getMenuItems(): Promise<MenuItem<LauncherCommandNames>[]> {
        const note = this.node.data.noteId ? await froca.getNote(this.node.data.noteId) : null;
        const parentNoteId = this.node.getParent().data.noteId;

        const isVisibleRoot = note?.noteId === '_lbVisibleLaunchers';
        const isAvailableRoot = note?.noteId === '_lbAvailableLaunchers';
        const isVisibleItem = parentNoteId === '_lbVisibleLaunchers';
        const isAvailableItem = parentNoteId === '_lbAvailableLaunchers';
        const isItem = isVisibleItem || isAvailableItem;
        const canBeDeleted = !note?.noteId.startsWith("_"); // fixed notes can't be deleted
        const canBeReset = !canBeDeleted && note?.isLaunchBarConfig();

        const items: (MenuItem<LauncherCommandNames> | null)[] = [
            (isVisibleRoot || isAvailableRoot) ? { title: t("launcher_context_menu.add-note-launcher"), command: 'addNoteLauncher', uiIcon: "bx bx-note" } : null,
            (isVisibleRoot || isAvailableRoot) ? { title: t("launcher_context_menu.add-script-launcher"), command: 'addScriptLauncher', uiIcon: "bx bx-code-curly" } : null,
            (isVisibleRoot || isAvailableRoot) ? { title: t("launcher_context_menu.add-custom-widget"), command: 'addWidgetLauncher', uiIcon: "bx bx-customize" } : null,
            (isVisibleRoot || isAvailableRoot) ? { title: t("launcher_context_menu.add-spacer"), command: 'addSpacerLauncher', uiIcon: "bx bx-dots-horizontal" } : null,
            (isVisibleRoot || isAvailableRoot) ? { title: "----" } : null,

            isAvailableItem ? { title: t("launcher_context_menu.move-to-visible-launchers"), command: "moveLauncherToVisible", uiIcon: "bx bx-show", enabled: true } : null,
            isVisibleItem ? { title: t("launcher_context_menu.move-to-available-launchers"), command: "moveLauncherToAvailable", uiIcon: "bx bx-hide", enabled: true } : null,
            (isVisibleItem || isAvailableItem) ? { title: "----" } : null,

            { title: `${t("launcher_context_menu.duplicate-launcher")} <kbd data-command="duplicateSubtree">`, command: "duplicateSubtree", uiIcon: "bx bx-outline", enabled: isItem },
            { title: `${t("launcher_context_menu.delete")} <kbd data-command="deleteNotes"></kbd>`, command: "deleteNotes", uiIcon: "bx bx-trash destructive-action-icon", enabled: canBeDeleted },

            { title: "----" },

            { title: t("launcher_context_menu.reset"), command: "resetLauncher", uiIcon: "bx bx-reset destructive-action-icon", enabled: canBeReset}
        ];
        return items.filter(row => row !== null);
    }

    async selectMenuItemHandler({command}: MenuCommandItem<LauncherCommandNames>) {
        if (!command) {
            return;
        }

        if (command === 'resetLauncher') {
            const confirmed = await dialogService.confirm(t("launcher_context_menu.reset_launcher_confirm", { title: this.node.title }));

            if (confirmed) {
                await server.post(`special-notes/launchers/${this.node.data.noteId}/reset`);
            }

            return;
        }

        this.treeWidget.triggerCommand(command, {
            node: this.node,
            notePath: treeService.getNotePath(this.node),
            selectedOrActiveBranchIds: this.treeWidget.getSelectedOrActiveBranchIds(this.node),
            selectedOrActiveNoteIds: this.treeWidget.getSelectedOrActiveNoteIds(this.node)
        });
    }
}
