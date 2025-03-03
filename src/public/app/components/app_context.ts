import froca from "../services/froca.js";
import bundleService from "../services/bundle.js";
import RootCommandExecutor from "./root_command_executor.js";
import Entrypoints, { type SqlExecuteResults } from "./entrypoints.js";
import options from "../services/options.js";
import utils from "../services/utils.js";
import zoomComponent from "./zoom.js";
import TabManager from "./tab_manager.js";
import Component from "./component.js";
import keyboardActionsService from "../services/keyboard_actions.js";
import linkService, { type ViewScope } from "../services/link.js";
import MobileScreenSwitcherExecutor, { type Screen } from "./mobile_screen_switcher.js";
import MainTreeExecutors from "./main_tree_executors.js";
import toast from "../services/toast.js";
import ShortcutComponent from "./shortcut_component.js";
import { t, initLocale } from "../services/i18n.js";
import type NoteDetailWidget from "../widgets/note_detail.js";
import type { ResolveOptions } from "../widgets/dialogs/delete_notes.js";
import type { PromptDialogOptions } from "../widgets/dialogs/prompt.js";
import type { ConfirmWithMessageOptions, ConfirmWithTitleOptions } from "../widgets/dialogs/confirm.js";
import type LoadResults from "../services/load_results.js";
import type { Attribute } from "../services/attribute_parser.js";
import type NoteTreeWidget from "../widgets/note_tree.js";
import type { default as NoteContext, GetTextEditorCallback } from "./note_context.js";
import type TypeWidget from "../widgets/type_widgets/type_widget.js";

interface Layout {
    getRootWidget: (appContext: AppContext) => RootWidget;
}

interface RootWidget extends Component {
    render: () => JQuery<HTMLElement>;
}

interface BeforeUploadListener extends Component {
    beforeUnloadEvent(): boolean;
}

/**
 * Base interface for the data/arguments for a given command (see {@link CommandMappings}).
 */
export interface CommandData {
    ntxId?: string | null;
}

/**
 * Represents a set of commands that are triggered from the context menu, providing information such as the selected note.
 */
export interface ContextMenuCommandData extends CommandData {
    node: Fancytree.FancytreeNode;
    notePath?: string;
    noteId?: string;
    selectedOrActiveBranchIds?: any; // TODO: Remove any once type is defined
    selectedOrActiveNoteIds: any; // TODO: Remove  any once type is defined
}

export interface NoteCommandData extends CommandData {
    notePath?: string | null;
    hoistedNoteId?: string | null;
    viewScope?: ViewScope;
}

export interface ExecuteCommandData<T> extends CommandData {
    resolve: (data: T) => void;
}

/**
 * The keys represent the different commands that can be triggered via {@link AppContext#triggerCommand} (first argument), and the values represent the data or arguments definition of the given command. All data for commands must extend {@link CommandData}.
 */
export type CommandMappings = {
    "api-log-messages": CommandData;
    focusTree: CommandData;
    focusOnTitle: CommandData;
    focusOnDetail: CommandData;
    focusOnSearchDefinition: Required<CommandData>;
    searchNotes: CommandData & {
        searchString?: string;
        ancestorNoteId?: string | null;
    };
    closeTocCommand: CommandData;
    closeHlt: CommandData;
    showLaunchBarSubtree: CommandData;
    showRevisions: CommandData;
    showOptions: CommandData & {
        section: string;
    };
    showExportDialog: CommandData & {
        notePath: string;
        defaultType: "single" | "subtree";
    };
    showDeleteNotesDialog: CommandData & {
        branchIdsToDelete: string[];
        callback: (value: ResolveOptions) => void;
        forceDeleteAllClones: boolean;
    };
    showConfirmDeleteNoteBoxWithNoteDialog: ConfirmWithTitleOptions;
    openedFileUpdated: CommandData & {
        entityType: string;
        entityId: string;
        lastModifiedMs: number;
        filePath: string;
    };
    focusAndSelectTitle: CommandData & {
        isNewNote?: boolean;
    };
    showPromptDialog: PromptDialogOptions;
    showInfoDialog: ConfirmWithMessageOptions;
    showConfirmDialog: ConfirmWithMessageOptions;
    showRecentChanges: CommandData & { ancestorNoteId: string };
    showImportDialog: CommandData & { noteId: string };
    openNewNoteSplit: NoteCommandData;
    openInWindow: NoteCommandData;
    openNoteInNewTab: CommandData;
    openNoteInNewSplit: CommandData;
    openNoteInNewWindow: CommandData;
    openAboutDialog: CommandData;
    hideFloatingButtons: {};
    hideLeftPane: CommandData;
    showLeftPane: CommandData;
    hoistNote: CommandData & { noteId: string };
    leaveProtectedSession: CommandData;
    enterProtectedSession: CommandData;

    openInTab: ContextMenuCommandData;
    openNoteInSplit: ContextMenuCommandData;
    toggleNoteHoisting: ContextMenuCommandData;
    insertNoteAfter: ContextMenuCommandData;
    insertChildNote: ContextMenuCommandData;
    delete: ContextMenuCommandData;
    editNoteTitle: ContextMenuCommandData;
    protectSubtree: ContextMenuCommandData;
    unprotectSubtree: ContextMenuCommandData;
    openBulkActionsDialog:
        | ContextMenuCommandData
        | {
              selectedOrActiveNoteIds?: string[];
          };
    editBranchPrefix: ContextMenuCommandData;
    convertNoteToAttachment: ContextMenuCommandData;
    duplicateSubtree: ContextMenuCommandData;
    expandSubtree: ContextMenuCommandData;
    collapseSubtree: ContextMenuCommandData;
    sortChildNotes: ContextMenuCommandData;
    copyNotePathToClipboard: ContextMenuCommandData;
    recentChangesInSubtree: ContextMenuCommandData;
    cutNotesToClipboard: ContextMenuCommandData;
    copyNotesToClipboard: ContextMenuCommandData;
    pasteNotesFromClipboard: ContextMenuCommandData;
    pasteNotesAfterFromClipboard: ContextMenuCommandData;
    moveNotesTo: ContextMenuCommandData;
    cloneNotesTo: ContextMenuCommandData;
    deleteNotes: ContextMenuCommandData;
    importIntoNote: ContextMenuCommandData;
    exportNote: ContextMenuCommandData;
    searchInSubtree: ContextMenuCommandData;
    moveNoteUp: ContextMenuCommandData;
    moveNoteDown: ContextMenuCommandData;
    moveNoteUpInHierarchy: ContextMenuCommandData;
    moveNoteDownInHierarchy: ContextMenuCommandData;
    selectAllNotesInParent: ContextMenuCommandData;

    addNoteLauncher: ContextMenuCommandData;
    addScriptLauncher: ContextMenuCommandData;
    addWidgetLauncher: ContextMenuCommandData;
    addSpacerLauncher: ContextMenuCommandData;
    moveLauncherToVisible: ContextMenuCommandData;
    moveLauncherToAvailable: ContextMenuCommandData;
    resetLauncher: ContextMenuCommandData;

    executeInActiveNoteDetailWidget: CommandData & {
        callback: (value: NoteDetailWidget | PromiseLike<NoteDetailWidget>) => void;
    };
    executeWithTextEditor: CommandData &
    ExecuteCommandData<TextEditor> & {
        callback?: GetTextEditorCallback;
    };
    executeWithCodeEditor: CommandData & ExecuteCommandData<null>;
    /**
     * Called upon when attempting to retrieve the content element of a {@link NoteContext}.
     * Generally should not be invoked manually, as it is used by {@link NoteContext.getContentElement}.
     */
    executeWithContentElement: CommandData & ExecuteCommandData<JQuery<HTMLElement>>;
    executeWithTypeWidget: CommandData & ExecuteCommandData<TypeWidget | null>;
    addTextToActiveEditor: CommandData & {
        text: string;
    };
    /** Works only in the electron context menu. */
    replaceMisspelling: CommandData;

    importMarkdownInline: CommandData;
    showPasswordNotSet: CommandData;
    showProtectedSessionPasswordDialog: CommandData;
    showUploadAttachmentsDialog: CommandData & { noteId: string };
    closeProtectedSessionPasswordDialog: CommandData;
    copyImageReferenceToClipboard: CommandData;
    copyImageToClipboard: CommandData;
    updateAttributesList: {
        attributes: Attribute[];
    };

    addNewLabel: CommandData;
    addNewRelation: CommandData;
    addNewLabelDefinition: CommandData;
    addNewRelationDefinition: CommandData;

    cloneNoteIdsTo: CommandData & {
        noteIds: string[];
    };
    moveBranchIdsTo: CommandData & {
        branchIds: string[];
    };
    /** Sets the active {@link Screen} (e.g. to toggle the tree sidebar). It triggers the {@link EventMappings.activeScreenChanged} event, but only if the provided <em>screen</em> is different than the current one. */
    setActiveScreen: CommandData & {
        screen: Screen;
    };
    closeTab: CommandData;
    closeToc: CommandData;
    closeOtherTabs: CommandData;
    closeRightTabs: CommandData;
    closeAllTabs: CommandData;
    reopenLastTab: CommandData;
    moveTabToNewWindow: CommandData;
    copyTabToNewWindow: CommandData;
    closeActiveTab: CommandData & {
        $el: JQuery<HTMLElement>;
    };
    setZoomFactorAndSave: {
        zoomFactor: string;
    };

    reEvaluateRightPaneVisibility: CommandData;
    runActiveNote: CommandData;
    scrollContainerToCommand: CommandData & {
        position: number;
    };
    scrollToEnd: CommandData;
    closeThisNoteSplit: CommandData;
    moveThisNoteSplit: CommandData & { isMovingLeft: boolean };

    // Geomap
    deleteFromMap: { noteId: string };
    openGeoLocation: { noteId: string; event: JQuery.MouseDownEvent };

    toggleZenMode: CommandData;

    updateAttributeList: CommandData & { attributes: Attribute[] };
    saveAttributes: CommandData;
    reloadAttributes: CommandData;
    refreshNoteList: CommandData & { noteId: string };

    refreshResults: {};
    refreshSearchDefinition: {};
};

type EventMappings = {
    initialRenderComplete: {};
    frocaReloaded: {};
    protectedSessionStarted: {};
    notesReloaded: {
        noteIds: string[];
    };
    refreshIncludedNote: {
        noteId: string;
    };
    apiLogMessages: {
        noteId: string;
        messages: string[];
    };
    entitiesReloaded: {
        loadResults: LoadResults;
    };
    addNewLabel: CommandData;
    addNewRelation: CommandData;
    sqlQueryResults: CommandData & {
        results: SqlExecuteResults;
    };
    readOnlyTemporarilyDisabled: {
        noteContext: NoteContext;
    };
    /** Triggered when the {@link CommandMappings.setActiveScreen} command is invoked. */
    activeScreenChanged: {
        activeScreen: Screen;
    };
    activeContextChanged: {
        noteContext: NoteContext;
    };
    beforeNoteSwitch: {
        noteContext: NoteContext;
    };
    beforeNoteContextRemove: {
        ntxIds: string[];
    };
    noteSwitched: {
        noteContext: NoteContext;
        notePath?: string | null;
    };
    noteSwitchedAndActivated: {
        noteContext: NoteContext;
        notePath: string;
    };
    setNoteContext: {
        noteContext: NoteContext;
    };
    noteTypeMimeChangedEvent: {
        noteId: string;
    };
    reEvaluateHighlightsListWidgetVisibility: {
        noteId: string | undefined;
    };
    reEvaluateTocWidgetVisibility: {
        noteId: string | undefined;
    };
    showHighlightsListWidget: {
        noteId: string;
    };
    showTocWidget: {
        noteId: string;
    };
    showSearchError: {
        error: string;
    };
    searchRefreshed: { ntxId?: string | null };
    hoistedNoteChanged: {
        noteId: string;
        ntxId: string | null;
    };
    contextsReopened: {
        mainNtxId: string | null;
        tabPosition: number;
    };
    noteDetailRefreshed: {
        ntxId?: string | null;
    };
    noteContextReorderEvent: {
        oldMainNtxId: string;
        newMainNtxId: string;
        ntxIdsInOrder: string[];
    };
    newNoteContextCreated: {
        noteContext: NoteContext;
    };
    noteContextRemoved: {
        ntxIds: string[];
    };
    exportSvg: {
        ntxId: string | null | undefined;
    };
    geoMapCreateChildNote: {
        ntxId: string | null | undefined; // TODO: deduplicate ntxId
    };
    tabReorder: {
        ntxIdsInOrder: string[];
    };
    refreshNoteList: {
        noteId: string;
    };
    noteTypeMimeChanged: { noteId: string };
    zenModeChanged: { isEnabled: boolean };
    relationMapCreateChildNote: { ntxId: string | null | undefined };
    relationMapResetPanZoom: { ntxId: string | null | undefined };
    relationMapResetZoomIn: { ntxId: string | null | undefined };
    relationMapResetZoomOut: { ntxId: string | null | undefined };
    activeNoteChanged: {};
};

export type EventListener<T extends EventNames> = {
    [key in T as `${key}Event`]: (data: EventData<T>) => void;
};

export type CommandListener<T extends CommandNames> = {
    [key in T as `${key}Command`]: (data: CommandListenerData<T>) => void;
};

export type CommandListenerData<T extends CommandNames> = CommandMappings[T];

type CommandAndEventMappings = CommandMappings & EventMappings;
type EventOnlyNames = keyof EventMappings;
export type EventNames = CommandNames | EventOnlyNames;
export type EventData<T extends EventNames> = CommandAndEventMappings[T];

/**
 * This type is a discriminated union which contains all the possible commands that can be triggered via {@link AppContext.triggerCommand}.
 */
export type CommandNames = keyof CommandMappings;

type FilterByValueType<T, ValueType> = { [K in keyof T]: T[K] extends ValueType ? K : never }[keyof T];

/**
 * Generic which filters {@link CommandNames} to provide only those commands that take in as data the desired implementation of {@link CommandData}. Mostly useful for contextual menu, to enforce consistency in the commands.
 */
export type FilteredCommandNames<T extends CommandData> = keyof Pick<CommandMappings, FilterByValueType<CommandMappings, T>>;

class AppContext extends Component {
    isMainWindow: boolean;
    components: Component[];
    beforeUnloadListeners: WeakRef<BeforeUploadListener>[];
    tabManager!: TabManager;
    layout?: Layout;
    noteTreeWidget?: NoteTreeWidget;

    lastSearchString?: string;

    constructor(isMainWindow: boolean) {
        super();

        this.isMainWindow = isMainWindow;
        // non-widget/layout components needed for the application
        this.components = [];
        this.beforeUnloadListeners = [];
    }

    /**
     * Must be called as soon as possible, before the creation of any components since this method is in charge of initializing the locale. Any attempts to read translation before this method is called will result in `undefined`.
     */
    async earlyInit() {
        await options.initializedPromise;
        await initLocale();
    }

    setLayout(layout: Layout) {
        this.layout = layout;
    }

    async start() {
        this.initComponents();
        this.renderWidgets();

        await froca.initializedPromise;

        this.tabManager.loadTabs();

        setTimeout(() => bundleService.executeStartupBundles(), 2000);
    }

    initComponents() {
        this.tabManager = new TabManager();

        this.components = [this.tabManager, new RootCommandExecutor(), new Entrypoints(), new MainTreeExecutors(), new ShortcutComponent()];

        if (utils.isMobile()) {
            this.components.push(new MobileScreenSwitcherExecutor());
        }

        for (const component of this.components) {
            this.child(component);
        }

        if (utils.isElectron()) {
            this.child(zoomComponent);
        }
    }

    renderWidgets() {
        if (!this.layout) {
            throw new Error("Missing layout.");
        }

        const rootWidget = this.layout.getRootWidget(this);
        const $renderedWidget = rootWidget.render();

        keyboardActionsService.updateDisplayedShortcuts($renderedWidget);

        $("body").append($renderedWidget);

        $renderedWidget.on("click", "[data-trigger-command]", function () {
            if ($(this).hasClass("disabled")) {
                return;
            }

            const commandName = $(this).attr("data-trigger-command");
            const $component = $(this).closest(".component");
            const component = $component.prop("component");

            component.triggerCommand(commandName, { $el: $(this) });
        });

        this.child(rootWidget);

        this.triggerEvent("initialRenderComplete", {});
    }

    triggerEvent<K extends EventNames>(name: K, data: EventData<K>) {
        return this.handleEvent(name, data);
    }

    triggerCommand<K extends CommandNames>(name: K, _data?: CommandMappings[K]) {
        const data = _data || {};
        for (const executor of this.components) {
            const fun = (executor as any)[`${name}Command`];

            if (fun) {
                return executor.callMethod(fun, data);
            }
        }

        // this might hint at error, but sometimes this is used by components which are at different places
        // in the component tree to communicate with each other
        console.debug(`Unhandled command ${name}, converting to event.`);

        return this.triggerEvent(name, data as CommandAndEventMappings[K]);
    }

    getComponentByEl(el: HTMLElement) {
        return $(el).closest(".component").prop("component");
    }

    addBeforeUnloadListener(obj: BeforeUploadListener) {
        if (typeof WeakRef !== "function") {
            // older browsers don't support WeakRef
            return;
        }

        this.beforeUnloadListeners.push(new WeakRef<BeforeUploadListener>(obj));
    }
}

const appContext = new AppContext(window.glob.isMainWindow);

// we should save all outstanding changes before the page/app is closed
$(window).on("beforeunload", () => {
    let allSaved = true;

    appContext.beforeUnloadListeners = appContext.beforeUnloadListeners.filter((wr) => !!wr.deref());

    for (const weakRef of appContext.beforeUnloadListeners) {
        const component = weakRef.deref();

        if (!component) {
            continue;
        }

        if (!component.beforeUnloadEvent()) {
            console.log(`Component ${component.componentId} is not finished saving its state.`);

            toast.showMessage(t("app_context.please_wait_for_save"), 10000);

            allSaved = false;
        }
    }

    if (!allSaved) {
        return "some string";
    }
});

$(window).on("hashchange", function () {
    const { notePath, ntxId, viewScope } = linkService.parseNavigationStateFromUrl(window.location.href);

    if (notePath || ntxId) {
        appContext.tabManager.switchToNoteContext(ntxId, notePath, viewScope);
    }
});

export default appContext;
