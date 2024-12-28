import froca from "../services/froca.js";
import bundleService from "../services/bundle.js";
import RootCommandExecutor from "./root_command_executor.js";
import Entrypoints, { SqlExecuteResults } from "./entrypoints.js";
import options from "../services/options.js";
import utils from "../services/utils.js";
import zoomComponent from "./zoom.js";
import TabManager from "./tab_manager.js";
import Component from "./component.js";
import keyboardActionsService from "../services/keyboard_actions.js";
import linkService, { ViewScope } from "../services/link.js";
import MobileScreenSwitcherExecutor, { Screen } from "./mobile_screen_switcher.js";
import MainTreeExecutors from "./main_tree_executors.js";
import toast from "../services/toast.js";
import ShortcutComponent from "./shortcut_component.js";
import { t, initLocale } from "../services/i18n.js";
import NoteDetailWidget from "../widgets/note_detail.js";
import { ResolveOptions } from "../widgets/dialogs/delete_notes.js";
import { PromptDialogOptions } from "../widgets/dialogs/prompt.js";
import { ConfirmWithMessageOptions, ConfirmWithTitleOptions } from "../widgets/dialogs/confirm.js";
import { Node } from "../services/tree.js";
import LoadResults from "../services/load_results.js";
import { Attribute } from "../services/attribute_parser.js";
import NoteTreeWidget from "../widgets/note_tree.js";
import { GetTextEditorCallback } from "./note_context.js";

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
    node: Node;
    notePath: string;
    noteId?: string;
    selectedOrActiveBranchIds: any; // TODO: Remove any once type is defined
    selectedOrActiveNoteIds: any; // TODO: Remove  any once type is defined
}

export interface NoteCommandData extends CommandData {
    notePath: string;
    hoistedNoteId?: string;
    viewScope?: ViewScope;
}

export interface ExecuteCommandData extends CommandData {
    resolve: unknown;
}

/**
 * The keys represent the different commands that can be triggered via {@link AppContext#triggerCommand} (first argument), and the values represent the data or arguments definition of the given command. All data for commands must extend {@link CommandData}.
 */
export type CommandMappings = {
    "api-log-messages": CommandData;
    focusOnDetail: Required<CommandData>;
    searchNotes: CommandData & {
        searchString: string | undefined;
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
        isNewNote: boolean;
    };
    showPromptDialog: PromptDialogOptions;
    showInfoDialog: ConfirmWithMessageOptions;
    showConfirmDialog: ConfirmWithMessageOptions;
    openNewNoteSplit: NoteCommandData;
    openInWindow: NoteCommandData,
    openNoteInNewTab: CommandData;
    openNoteInNewSplit: CommandData;
    openNoteInNewWindow: CommandData;

    openInTab: ContextMenuCommandData;
    openNoteInSplit: ContextMenuCommandData;
    toggleNoteHoisting: ContextMenuCommandData;
    insertNoteAfter: ContextMenuCommandData;
    insertChildNote: ContextMenuCommandData;
    protectSubtree: ContextMenuCommandData;
    unprotectSubtree: ContextMenuCommandData;
    openBulkActionsDialog: ContextMenuCommandData;
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

    addNoteLauncher: ContextMenuCommandData;
    addScriptLauncher: ContextMenuCommandData;
    addWidgetLauncher: ContextMenuCommandData;
    addSpacerLauncher: ContextMenuCommandData;
    moveLauncherToVisible: ContextMenuCommandData;
    moveLauncherToAvailable: ContextMenuCommandData;
    resetLauncher: ContextMenuCommandData;

    executeInActiveNoteDetailWidget: CommandData & {
        callback: (value: NoteDetailWidget | PromiseLike<NoteDetailWidget>) => void
    };
    executeWithTextEditor: CommandData & ExecuteCommandData & {
        callback?: GetTextEditorCallback;
    };
    executeWithCodeEditor: CommandData & ExecuteCommandData;
    executeWithContentElement: CommandData & ExecuteCommandData;
    executeWithTypeWidget: CommandData & ExecuteCommandData;
    addTextToActiveEditor: CommandData & {
        text: string;
    };
    /** Works only in the electron context menu. */
    replaceMisspelling: CommandData;

    importMarkdownInline: CommandData;
    showPasswordNotSet: CommandData;
    showProtectedSessionPasswordDialog: CommandData;
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
    setActiveScreen: CommandData & {
        screen: Screen;
    }
}

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
        loadResults: LoadResults
    };
    addNewLabel: CommandData;
    addNewRelation: CommandData;
    sqlQueryResults: CommandData & {
        results: SqlExecuteResults;
    }
}

export type EventListener<T extends EventNames> = {
    [key in T as `${key}Event`]: (data: EventData<T>) => void
}

export type CommandListener<T extends CommandNames> = {
    [key in T as `${key}Command`]: (data: CommandListenerData<T>) => void
}

export type CommandListenerData<T extends CommandNames> = CommandMappings[T];
export type EventData<T extends EventNames> = EventMappings[T];

type CommandAndEventMappings = (CommandMappings & EventMappings);

/**
 * This type is a discriminated union which contains all the possible commands that can be triggered via {@link AppContext.triggerCommand}.
 */
export type CommandNames = keyof CommandMappings;
type EventNames = keyof EventMappings;

type FilterByValueType<T, ValueType> = { [K in keyof T]: T[K] extends ValueType ? K : never; }[keyof T];

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

        this.components = [
            this.tabManager,
            new RootCommandExecutor(),
            new Entrypoints(),
            new MainTreeExecutors(),
            new ShortcutComponent()
        ];

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

        $renderedWidget.on('click', "[data-trigger-command]", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            const commandName = $(this).attr('data-trigger-command');
            const $component = $(this).closest(".component");
            const component = $component.prop("component");

            component.triggerCommand(commandName, {$el: $(this)});
        });

        this.child(rootWidget);

        this.triggerEvent('initialRenderComplete');
    }

    // TODO: Remove ignore once all commands are mapped out.
    //@ts-ignore
    triggerEvent<K extends EventNames | CommandNames>(name: K, data: CommandAndEventMappings[K] = {}) {
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
        return $(el).closest(".component").prop('component');
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
$(window).on('beforeunload', () => {
    let allSaved = true;

    appContext.beforeUnloadListeners = appContext.beforeUnloadListeners.filter(wr => !!wr.deref());

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

$(window).on('hashchange', function() {
    const {notePath, ntxId, viewScope} = linkService.parseNavigationStateFromUrl(window.location.href);

    if (notePath || ntxId) {
        appContext.tabManager.switchToNoteContext(ntxId, notePath, viewScope);
    }
});

export default appContext;
