import BAttribute from "../becca/entities/battribute.js";
import { AttributeType, NoteType } from "../becca/entities/rows.js";

import becca from "../becca/becca.js";
import noteService from "./notes.js";
import log from "./log.js";
import migrationService from "./migration.js";
import { t } from "i18next";

const LBTPL_ROOT = "_lbTplRoot";
const LBTPL_BASE = "_lbTplBase";
const LBTPL_COMMAND = "_lbTplCommandLauncher";
const LBTPL_NOTE_LAUNCHER = "_lbTplNoteLauncher";
const LBTPL_SCRIPT = "_lbTplScriptLauncher";
const LBTPL_BUILTIN_WIDGET = "_lbTplBuiltinWidget";
const LBTPL_SPACER = "_lbTplSpacer";
const LBTPL_CUSTOM_WIDGET = "_lbTplCustomWidget";

interface Attribute {
    type: AttributeType;
    name: string;
    isInheritable?: boolean;
    value?: string
}

interface Item {
    notePosition?: number;
    id: string;
    title: string;
    type: NoteType;
    icon?: string;
    attributes?: Attribute[];
    children?: Item[];
    isExpanded?: boolean;
    baseSize?: string;
    growthFactor?: string;
    targetNoteId?: "_backendLog" | "_globalNoteMap";
    builtinWidget?: "bookmarks" | "spacer" | "backInHistoryButton" | "forwardInHistoryButton" | "syncStatus" | "protectedSession" | "todayInJournal" | "calendar" | "quickSearch";
    command?: keyof typeof Command;
}

// TODO: Move this into a commons project once the client/server architecture is well split.
enum Command {
    jumpToNote,
    searchNotes,
    createNoteIntoInbox,
    showRecentChanges,
    showOptions
}

/*
 * Hidden subtree is generated as a "predictable structure" which means that it avoids generating random IDs to always
 * produce the same structure. This is needed because it is run on multiple instances in the sync cluster which might produce
 * duplicate subtrees. This way, all instances will generate the same structure with the same IDs.
 */

let hiddenSubtreeDefinition: Item;

function buildHiddenSubtreeDefinition(): Item {
    return {
        id: '_hidden',
        title: t("hidden-subtree.root-title"),
        type: 'doc',
        icon: 'bx bx-hide',
        // we want to keep the hidden subtree always last, otherwise there will be problems with e.g., keyboard navigation
        // over tree when it's in the middle
        notePosition: 999_999_999,
        attributes: [
            { type: 'label', name: 'excludeFromNoteMap', isInheritable: true },
            { type: 'label', name: 'docName', value: 'hidden' }
        ],
        children: [
            {
                id: '_search',
                title: t("hidden-subtree.search-history-title"),
                type: 'doc'
            },
            {
                id: '_globalNoteMap',
                title: t("hidden-subtree.note-map-title"),
                type: 'noteMap',
                attributes: [
                    { type: 'label', name: 'mapRootNoteId', value: 'hoisted' },
                    { type: 'label', name: 'keepCurrentHoisting' }
                ]
            },
            {
                id: '_sqlConsole',
                title: t("hidden-subtree.sql-console-history-title"),
                type: 'doc',
                icon: 'bx-data'
            },
            {
                id: '_share',
                title: t("hidden-subtree.shared-notes-title"),
                type: 'doc',
                attributes: [ { type: 'label', name: 'docName', value: 'share' } ]
            },
            {
                id: '_bulkAction',
                title: t("hidden-subtree.bulk-action-title"),
                type: 'doc',
            },
            {
                id: '_backendLog',
                title: t("hidden-subtree.backend-log-title"),
                type: 'contentWidget',
                icon: 'bx-terminal',
                attributes: [
                    { type: 'label', name: 'keepCurrentHoisting' },
                    { type: 'label', name: 'fullContentWidth' }
                ]
            },
            {
                // place for user scripts hidden stuff (scripts should not create notes directly under hidden root)
                id: '_userHidden',
                title: t("hidden-subtree.user-hidden-title"),
                type: 'doc',
                attributes: [ { type: 'label', name: 'docName', value: 'user_hidden' } ]
            },
            {
                id: LBTPL_ROOT,
                title: t("hidden-subtree.launch-bar-templates-title"),
                type: 'doc',
                children: [
                    {
                        id: LBTPL_BASE,
                        title: t("hidden-subtree.base-abstract-launcher-title"),
                        type: 'doc'
                    },
                    {
                        id: LBTPL_COMMAND,
                        title: t("hidden-subtree.command-launcher-title"),
                        type: 'doc',
                        attributes: [
                            { type: 'relation', name: 'template', value: LBTPL_BASE },
                            { type: 'label', name: 'launcherType', value: 'command' },
                            { type: 'label', name: 'docName', value: 'launchbar_command_launcher' }
                        ]
                    },
                    {
                        id: LBTPL_NOTE_LAUNCHER,
                        title: t("hidden-subtree.note-launcher-title"),
                        type: 'doc',
                        attributes: [
                            { type: 'relation', name: 'template', value: LBTPL_BASE },
                            { type: 'label', name: 'launcherType', value: 'note' },
                            { type: 'label', name: 'relation:target', value: 'promoted' },
                            { type: 'label', name: 'relation:hoistedNote', value: 'promoted' },
                            { type: 'label', name: 'label:keyboardShortcut', value: 'promoted,text' },
                            { type: 'label', name: 'docName', value: 'launchbar_note_launcher' }
                        ]
                    },
                    {
                        id: LBTPL_SCRIPT,
                        title: t("hidden-subtree.script-launcher-title"),
                        type: 'doc',
                        attributes: [
                            { type: 'relation', name: 'template', value: LBTPL_BASE },
                            { type: 'label', name: 'launcherType', value: 'script' },
                            { type: 'label', name: 'relation:script', value: 'promoted' },
                            { type: 'label', name: 'label:keyboardShortcut', value: 'promoted,text' },
                            { type: 'label', name: 'docName', value: 'launchbar_script_launcher' }
                        ]
                    },
                    {
                        id: LBTPL_BUILTIN_WIDGET,
                        title: t("hidden-subtree.built-in-widget-title"),
                        type: 'doc',
                        attributes: [
                            { type: 'relation', name: 'template', value: LBTPL_BASE },
                            { type: 'label', name: 'launcherType', value: 'builtinWidget' }
                        ]
                    },
                    {
                        id: LBTPL_SPACER,
                        title: t("hidden-subtree.spacer-title"),
                        type: 'doc',
                        icon: 'bx-move-vertical',
                        attributes: [
                            { type: 'relation', name: 'template', value: LBTPL_BUILTIN_WIDGET },
                            { type: 'label', name: 'builtinWidget', value: 'spacer' },
                            { type: 'label', name: 'label:baseSize', value: 'promoted,number' },
                            { type: 'label', name: 'label:growthFactor', value: 'promoted,number' },
                            { type: 'label', name: 'docName', value: 'launchbar_spacer' }
                        ]
                    },
                    {
                        id: LBTPL_CUSTOM_WIDGET,
                        title: t("hidden-subtree.custom-widget-title"),
                        type: 'doc',
                        attributes: [
                            { type: 'relation', name: 'template', value: LBTPL_BASE },
                            { type: 'label', name: 'launcherType', value: 'customWidget' },
                            { type: 'label', name: 'relation:widget', value: 'promoted' },
                            { type: 'label', name: 'docName', value: 'launchbar_widget_launcher' }
                        ]
                    },
                ]
            },
            {
                id: '_lbRoot',
                title: t("hidden-subtree.launch-bar-title"),
                type: 'doc',
                icon: 'bx-sidebar',
                isExpanded: true,
                attributes: [ { type: 'label', name: 'docName', value: 'launchbar_intro' } ],
                children: [
                    {
                        id: '_lbAvailableLaunchers',
                        title: t("hidden-subtree.available-launchers-title"),
                        type: 'doc',
                        icon: 'bx-hide',
                        isExpanded: true,
                        attributes: [ { type: 'label', name: 'docName', value: 'launchbar_intro' } ],
                        children: [
                            { id: '_lbBackInHistory', title: t("hidden-subtree.go-to-previous-note-title"), type: 'launcher', builtinWidget: 'backInHistoryButton', icon: 'bx bxs-chevron-left',
                                attributes: [ { type: 'label', name: 'docName', value: 'launchbar_history_navigation' } ]},
                            { id: '_lbForwardInHistory', title: t("hidden-subtree.go-to-next-note-title"), type: 'launcher', builtinWidget: 'forwardInHistoryButton', icon: 'bx bxs-chevron-right',
                                attributes: [ { type: 'label', name: 'docName', value: 'launchbar_history_navigation' } ]},
                            { id: '_lbBackendLog', title: t("hidden-subtree.backend-log-title"), type: 'launcher', targetNoteId: '_backendLog', icon: 'bx bx-terminal' },
                        ]
                    },
                    {
                        id: '_lbVisibleLaunchers',
                        title: t("hidden-subtree.visible-launchers-title"),
                        type: 'doc',
                        icon: 'bx-show',
                        isExpanded: true,
                        attributes: [ { type: 'label', name: 'docName', value: 'launchbar_intro' } ],
                        children: [
                            { id: '_lbNewNote', title: t("hidden-subtree.new-note-title"), type: 'launcher', command: 'createNoteIntoInbox', icon: 'bx bx-file-blank' },
                            { id: '_lbSearch', title: t("hidden-subtree.search-notes-title"), type: 'launcher', command: 'searchNotes', icon: 'bx bx-search', attributes: [
                                    { type: 'label', name: 'desktopOnly' }
                                ] },
                            { id: '_lbJumpTo', title: t("hidden-subtree.jump-to-note-title"), type: 'launcher', command: 'jumpToNote', icon: 'bx bx-send', attributes: [
                                    { type: 'label', name: 'desktopOnly' }
                                ] },
                            { id: '_lbNoteMap', title: t("hidden-subtree.note-map-title"), type: 'launcher', targetNoteId: '_globalNoteMap', icon: 'bx bxs-network-chart' },
                            { id: '_lbCalendar', title: t("hidden-subtree.calendar-title"), type: 'launcher', builtinWidget: 'calendar', icon: 'bx bx-calendar' },
                            { id: '_lbRecentChanges', title: t("hidden-subtree.recent-changes-title"), type: 'launcher', command: 'showRecentChanges', icon: 'bx bx-history', attributes: [
                                    { type: 'label', name: 'desktopOnly' }
                                ] },
                            { id: '_lbSpacer1', title: t("hidden-subtree.spacer-title"), type: 'launcher', builtinWidget: 'spacer', baseSize: "50", growthFactor: "0" },
                            { id: '_lbBookmarks', title: t("hidden-subtree.bookmarks-title"), type: 'launcher', builtinWidget: 'bookmarks', icon: 'bx bx-bookmark' },
                            { id: '_lbToday', title: t("hidden-subtree.open-today-journal-note-title"), type: 'launcher', builtinWidget: 'todayInJournal', icon: 'bx bx-calendar-star' },
                            { id: '_lbSpacer2', title: t("hidden-subtree.spacer-title"), type: 'launcher', builtinWidget: 'spacer', baseSize: "0", growthFactor: "1" },
                            { id: '_lbQuickSearch', title: t("hidden-subtree.quick-search-title"), type: "launcher", builtinWidget: "quickSearch", icon: "bx bx-rectangle" },
                            { id: '_lbProtectedSession', title: t("hidden-subtree.protected-session-title"), type: 'launcher', builtinWidget: 'protectedSession', icon: 'bx bx bx-shield-quarter' },
                            { id: '_lbSyncStatus', title: t("hidden-subtree.sync-status-title"), type: 'launcher', builtinWidget: 'syncStatus', icon: 'bx bx-wifi' },
                            { id: '_lbSettings', title: t("hidden-subtree.settings-title"), type: 'launcher', command: 'showOptions', icon: 'bx bx-cog' }
                        ]
                    }
                ]
            },
            {
                id: '_options',
                title: t("hidden-subtree.options-title"),
                type: 'book',
                icon: 'bx-cog',
                children: [
                    { id: '_optionsAppearance', title: t("hidden-subtree.appearance-title"), type: 'contentWidget', icon: 'bx-layout' },
                    { id: '_optionsShortcuts', title: t("hidden-subtree.shortcuts-title"), type: 'contentWidget', icon: 'bxs-keyboard' },
                    { id: '_optionsTextNotes', title: t("hidden-subtree.text-notes"), type: 'contentWidget', icon: 'bx-text' },
                    { id: '_optionsCodeNotes', title: t("hidden-subtree.code-notes-title"), type: 'contentWidget', icon: 'bx-code' },
                    { id: '_optionsImages', title: t("hidden-subtree.images-title"), type: 'contentWidget', icon: 'bx-image' },
                    { id: '_optionsSpellcheck', title: t("hidden-subtree.spellcheck-title"), type: 'contentWidget', icon: 'bx-check-double' },
                    { id: '_optionsPassword', title: t("hidden-subtree.password-title"), type: 'contentWidget', icon: 'bx-lock' },
                    { id: '_optionsEtapi', title: t("hidden-subtree.etapi-title"), type: 'contentWidget', icon: 'bx-extension' },
                    { id: '_optionsBackup', title: t("hidden-subtree.backup-title"), type: 'contentWidget', icon: 'bx-data' },
                    { id: '_optionsSync', title: t("hidden-subtree.sync-title"), type: 'contentWidget', icon: 'bx-wifi' },
                    { id: '_optionsOther', title: t("hidden-subtree.other"), type: 'contentWidget', icon: 'bx-dots-horizontal' },
                    { id: '_optionsAdvanced', title: t("hidden-subtree.advanced-title"), type: 'contentWidget' }
                ]
            }
        ]
    };
}

interface CheckHiddenExtraOpts {
    restoreNames?: boolean;
}

function checkHiddenSubtree(force = false, extraOpts: CheckHiddenExtraOpts = {}) {    
    if (!force && !migrationService.isDbUpToDate()) {
        // on-delete hook might get triggered during some future migration and cause havoc
        log.info("Will not check hidden subtree until migration is finished.");
        return;
    }

    if (!hiddenSubtreeDefinition || force) {
        hiddenSubtreeDefinition = buildHiddenSubtreeDefinition();
    }

    checkHiddenSubtreeRecursively('root', hiddenSubtreeDefinition, extraOpts);
}

function checkHiddenSubtreeRecursively(parentNoteId: string, item: Item, extraOpts: CheckHiddenExtraOpts = {}) {
    if (!item.id || !item.type || !item.title) {
        throw new Error(`Item does not contain mandatory properties: ${JSON.stringify(item)}`);
    }

    if (item.id.charAt(0) !== '_') {
        throw new Error(`ID has to start with underscore, given '${item.id}'`);
    }

    let note = becca.notes[item.id];
    let branch;

    if (!note) {
        ({note, branch} = noteService.createNewNote({
            noteId: item.id,
            title: item.title,
            type: item.type,
            parentNoteId: parentNoteId,
            content: '',
            ignoreForbiddenParents: true
        }));
    } else {
        branch = note.getParentBranches().find(branch => branch.parentNoteId === parentNoteId);
    }

    const attrs = [...(item.attributes || [])];

    if (item.icon) {
        attrs.push({ type: 'label', name: 'iconClass', value: `bx ${item.icon}` });
    }

    if (item.type === 'launcher') {
        if (item.command) {
            attrs.push({ type: 'relation', name: 'template', value: LBTPL_COMMAND });
            attrs.push({ type: 'label', name: 'command', value: item.command });
        } else if (item.builtinWidget) {
            if (item.builtinWidget === 'spacer') {
                attrs.push({ type: 'relation', name: 'template', value: LBTPL_SPACER });
                attrs.push({ type: 'label', name: 'baseSize', value: item.baseSize });
                attrs.push({ type: 'label', name: 'growthFactor', value: item.growthFactor });
            } else {
                attrs.push({ type: 'relation', name: 'template', value: LBTPL_BUILTIN_WIDGET });
            }

            attrs.push({ type: 'label', name: 'builtinWidget', value: item.builtinWidget });
        } else if (item.targetNoteId) {
            attrs.push({ type: 'relation', name: 'template', value: LBTPL_NOTE_LAUNCHER });
            attrs.push({ type: 'relation', name: 'target', value: item.targetNoteId });
        } else {
            throw new Error(`No action defined for launcher ${JSON.stringify(item)}`);
        }
    }

    if (extraOpts.restoreNames && note.title !== item.title) {
        note.title = item.title;
        note.save();
    }

    if (note.type !== item.type) {
        // enforce a correct note type
        note.type = item.type;
        note.save();
    }

    if (branch) {
        // in case of launchers the branch ID is not preserved and should not be relied upon - launchers which move between
        // visible and available will change branch since the branch's parent-child relationship is immutable
        if (item.notePosition !== undefined && branch.notePosition !== item.notePosition) {
            branch.notePosition = item.notePosition;
            branch.save();
        }

        if (item.isExpanded !== undefined && branch.isExpanded !== item.isExpanded) {
            branch.isExpanded = item.isExpanded;
            branch.save();
        }
    }

    for (const attr of attrs) {
        const attrId = note.noteId + "_" + attr.type.charAt(0) + attr.name;

        if (!note.getAttributes().find(attr => attr.attributeId === attrId)) {
            new BAttribute({
                attributeId: attrId,
                noteId: note.noteId,
                type: attr.type,
                name: attr.name,
                value: attr.value,
                isInheritable: false
            }).save();
        }
    }

    for (const child of item.children || []) {
        checkHiddenSubtreeRecursively(item.id, child, extraOpts);
    }
}

export default {
    checkHiddenSubtree,
    LBTPL_ROOT,
    LBTPL_BASE,
    LBTPL_COMMAND,
    LBTPL_NOTE_LAUNCHER,
    LBTPL_SCRIPT,
    LBTPL_BUILTIN_WIDGET,
    LBTPL_SPACER,
    LBTPL_CUSTOM_WIDGET
};
