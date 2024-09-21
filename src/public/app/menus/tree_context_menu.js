import treeService from '../services/tree.js';
import froca from "../services/froca.js";
import clipboard from '../services/clipboard.js';
import noteCreateService from "../services/note_create.js";
import contextMenu from "./context_menu.js";
import appContext from "../components/app_context.js";
import noteTypesService from "../services/note_types.js";
import server from "../services/server.js";
import toastService from "../services/toast.js";
import dialogService from "../services/dialog.js";
import { t } from "../services/i18n.js";

export default class TreeContextMenu {
    /**
     * @param {NoteTreeWidget} treeWidget
     * @param {FancytreeNode} node
     */
    constructor(treeWidget, node) {
        this.treeWidget = treeWidget;
        this.node = node;
    }

    async show(e) {
        contextMenu.show({
            x: e.pageX,
            y: e.pageY,
            items: await this.getMenuItems(),
            selectMenuItemHandler: (item, e) => this.selectMenuItemHandler(item)
        })
    }

    async getMenuItems() {
        const note = await froca.getNote(this.node.data.noteId);
        const branch = froca.getBranch(this.node.data.branchId);
        const isNotRoot = note.noteId !== 'root';
        const isHoisted = note.noteId === appContext.tabManager.getActiveContext().hoistedNoteId;
        const parentNote = isNotRoot ? await froca.getNote(branch.parentNoteId) : null;

        // some actions don't support multi-note, so they are disabled when notes are selected,
        // the only exception is when the only selected note is the one that was right-clicked, then
        // it's clear what the user meant to do.
        const selNodes = this.treeWidget.getSelectedNodes();
        const noSelectedNotes = selNodes.length === 0
                || (selNodes.length === 1 && selNodes[0] === this.node);

        const notSearch = note.type !== 'search';
        const notOptions = !note.noteId.startsWith("_options");
        const parentNotSearch = !parentNote || parentNote.type !== 'search';
        const insertNoteAfterEnabled = isNotRoot && !isHoisted && parentNotSearch;

        return [
            { title: `${t("tree-context-menu.open-in-a-new-tab")} <kbd>Ctrl+Click</kbd>`, command: "openInTab", uiIcon: "bx bx-empty", enabled: noSelectedNotes },
            { title: t("tree-context-menu.open-in-a-new-split"), command: "openNoteInSplit", uiIcon: "bx bx-dock-right", enabled: noSelectedNotes },
            { title: `${t("tree-context-menu.insert-note-after")} <kbd data-command="createNoteAfter"></kbd>`, command: "insertNoteAfter", uiIcon: "bx bx-plus",
                items: insertNoteAfterEnabled ? await noteTypesService.getNoteTypeItems("insertNoteAfter") : null,
                enabled: insertNoteAfterEnabled && noSelectedNotes && notOptions },
            { title: `${t("tree-context-menu.insert-child-note")} <kbd data-command="createNoteInto"></kbd>`, command: "insertChildNote", uiIcon: "bx bx-plus",
                items: notSearch ? await noteTypesService.getNoteTypeItems("insertChildNote") : null,
                enabled: notSearch && noSelectedNotes && notOptions },
            { title: `${t("tree-context-menu.delete")} <kbd data-command="deleteNotes"></kbd>`, command: "deleteNotes", uiIcon: "bx bx-trash",
                enabled: isNotRoot && !isHoisted && parentNotSearch && notOptions },
            { title: "----" },
            { title: `${t("tree-context-menu.search-in-subtree")} <kbd data-command="searchInSubtree"></kbd>`, command: "searchInSubtree", uiIcon: "bx bx-search",
                enabled: notSearch && noSelectedNotes },
            isHoisted ? null : { title: 'Hoist note <kbd data-command="toggleNoteHoisting"></kbd>', command: "toggleNoteHoisting", uiIcon: "bx bx-empty", enabled: noSelectedNotes && notSearch },
            !isHoisted || !isNotRoot ? null : { title: 'Unhoist note <kbd data-command="toggleNoteHoisting"></kbd>', command: "toggleNoteHoisting", uiIcon: "bx bx-door-open" },
            { title: `${t("tree-context-menu.edit-branch-prefix")} <kbd data-command="editBranchPrefix"></kbd>`, command: "editBranchPrefix", uiIcon: "bx bx-empty",
                enabled: isNotRoot && parentNotSearch && noSelectedNotes && notOptions },
            { title: t("tree-context-menu.advanced"), uiIcon: "bx bx-empty", enabled: true, items: [
                    { title: `${t("tree-context-menu.expand-subtree")} <kbd data-command="expandSubtree"></kbd>`, command: "expandSubtree", uiIcon: "bx bx-expand", enabled: noSelectedNotes },
                    { title: `${t("tree-context-menu.collapse-subtree")} <kbd data-command="collapseSubtree"></kbd>`, command: "collapseSubtree", uiIcon: "bx bx-collapse", enabled: noSelectedNotes },
                    { title: `${t("tree-context-menu.sort-by")} <kbd data-command="sortChildNotes"></kbd>`, command: "sortChildNotes", uiIcon: "bx bx-empty", enabled: noSelectedNotes && notSearch },
                    { title: t("tree-context-menu.recent-changes-in-subtree"), command: "recentChangesInSubtree", uiIcon: "bx bx-history", enabled: noSelectedNotes && notOptions },
                    { title: t("tree-context-menu.convert-to-attachment"), command: "convertNoteToAttachment", uiIcon: "bx bx-empty", enabled: isNotRoot && !isHoisted && notOptions },
                    { title: t("tree-context-menu.copy-note-path-to-clipboard"), command: "copyNotePathToClipboard", uiIcon: "bx bx-empty", enabled: true }
                ] },
            { title: "----" },
            { title: t("tree-context-menu.protect-subtree"), command: "protectSubtree", uiIcon: "bx bx-check-shield", enabled: noSelectedNotes },
            { title: t("tree-context-menu.unprotect-subtree"), command: "unprotectSubtree", uiIcon: "bx bx-shield", enabled: noSelectedNotes },
            { title: "----" },
            { title: `${t("tree-context-menu.copy-clone")} <kbd data-command="copyNotesToClipboard"></kbd>`, command: "copyNotesToClipboard", uiIcon: "bx bx-copy",
                enabled: isNotRoot && !isHoisted },
            { title: `${t("tree-context-menu.clone-to")} <kbd data-command="cloneNotesTo"></kbd>`, command: "cloneNotesTo", uiIcon: "bx bx-empty",
                enabled: isNotRoot && !isHoisted },
            { title: `${t("tree-context-menu.cut")} <kbd data-command="cutNotesToClipboard"></kbd>`, command: "cutNotesToClipboard", uiIcon: "bx bx-cut",
                enabled: isNotRoot && !isHoisted && parentNotSearch },
            { title: `${t("tree-context-menu.move-to")} <kbd data-command="moveNotesTo"></kbd>`, command: "moveNotesTo", uiIcon: "bx bx-empty",
                enabled: isNotRoot && !isHoisted && parentNotSearch },
            { title: `${t("tree-context-menu.paste-into")} <kbd data-command="pasteNotesFromClipboard"></kbd>`, command: "pasteNotesFromClipboard", uiIcon: "bx bx-paste",
                enabled: !clipboard.isClipboardEmpty() && notSearch && noSelectedNotes },
            { title: t("tree-context-menu.paste-after"), command: "pasteNotesAfterFromClipboard", uiIcon: "bx bx-paste",
                enabled: !clipboard.isClipboardEmpty() && isNotRoot && !isHoisted && parentNotSearch && noSelectedNotes },
            { title: `${t("tree-context-menu.duplicate-subtree")} <kbd data-command="duplicateSubtree">`, command: "duplicateSubtree", uiIcon: "bx bx-empty",
                enabled: parentNotSearch && isNotRoot && !isHoisted && notOptions },
            { title: "----" },
            { title: t("tree-context-menu.export"), command: "exportNote", uiIcon: "bx bx-empty",
                enabled: notSearch && noSelectedNotes && notOptions },
            { title: t("tree-context-menu.import-into-note"), command: "importIntoNote", uiIcon: "bx bx-empty",
                enabled: notSearch && noSelectedNotes && notOptions },
            { title: t("tree-context-menu.apply-bulk-actions"), command: "openBulkActionsDialog", uiIcon: "bx bx-list-plus",
                enabled: true }
        ].filter(row => row !== null);
    }

    async selectMenuItemHandler({command, type, templateNoteId}) {
        const notePath = treeService.getNotePath(this.node);

        if (command === 'openInTab') {
            appContext.tabManager.openTabWithNoteWithHoisting(notePath);
        }
        else if (command === "insertNoteAfter") {
            const parentNotePath = treeService.getNotePath(this.node.getParent());
            const isProtected = treeService.getParentProtectedStatus(this.node);

            noteCreateService.createNote(parentNotePath, {
                target: 'after',
                targetBranchId: this.node.data.branchId,
                type: type,
                isProtected: isProtected,
                templateNoteId: templateNoteId
            });
        }
        else if (command === "insertChildNote") {
            const parentNotePath = treeService.getNotePath(this.node);

            noteCreateService.createNote(parentNotePath, {
                type: type,
                isProtected: this.node.data.isProtected,
                templateNoteId: templateNoteId
            });
        }
        else if (command === 'openNoteInSplit') {
            const subContexts = appContext.tabManager.getActiveContext().getSubContexts();
            const {ntxId} = subContexts[subContexts.length - 1];

            this.treeWidget.triggerCommand("openNewNoteSplit", {ntxId, notePath});
        }
        else if (command === 'convertNoteToAttachment') {
            if (!await dialogService.confirm(`Are you sure you want to convert note selected notes into attachments of their parent notes?`)) {
                return;
            }

            let converted = 0;

            for (const noteId of this.treeWidget.getSelectedOrActiveNoteIds(this.node)) {
                const note = await froca.getNote(noteId);

                if (note.isEligibleForConversionToAttachment()) {
                    const {attachment} = await server.post(`notes/${note.noteId}/convert-to-attachment`);

                    if (attachment) {
                        converted++;
                    }
                }
            }

            toastService.showMessage(`${converted} notes have been converted to attachments.`);
        }
        else if (command === 'copyNotePathToClipboard') {
            navigator.clipboard.writeText('#' + notePath);
        }
        else {
            this.treeWidget.triggerCommand(command, {
                node: this.node,
                notePath: notePath,
                noteId: this.node.data.noteId,
                selectedOrActiveBranchIds: this.treeWidget.getSelectedOrActiveBranchIds(this.node),
                selectedOrActiveNoteIds: this.treeWidget.getSelectedOrActiveNoteIds(this.node)
            });
        }
    }
}
