import froca from "../services/froca.js";
import bundleService from "../services/bundle.js";
import RootCommandExecutor from "./root_command_executor.js";
import Entrypoints from "./entrypoints.js";
import options from "../services/options.js";
import utils from "../services/utils.js";
import zoomComponent from "./zoom.js";
import TabManager from "./tab_manager.js";
import Component from "./component.js";
import keyboardActionsService from "../services/keyboard_actions.js";
import linkService from "../services/link.js";
import MobileScreenSwitcherExecutor from "./mobile_screen_switcher.js";
import MainTreeExecutors from "./main_tree_executors.js";
import toast from "../services/toast.js";
import ShortcutComponent from "./shortcut_component.js";
import { t, initLocale } from "../services/i18n.js";

interface Layout {
    getRootWidget: (appContext: AppContext) => RootWidget;
}

interface RootWidget extends Component {
    render: () => JQuery<HTMLElement>;    
}

interface BeforeUploadListener extends Component {
    beforeUnloadEvent(): boolean;
}

interface TriggerData {
    noteId?: string;
    noteIds?: string[];
    messages?: unknown[];
    callback?: () => void;
}

class AppContext extends Component {

    isMainWindow: boolean;
    components: Component[];
    beforeUnloadListeners: WeakRef<BeforeUploadListener>[];
    tabManager!: TabManager;
    layout?: Layout;

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

    triggerEvent(name: string, data: TriggerData = {}) {
        return this.handleEvent(name, data);
    }

    triggerCommand(name: string, data: TriggerData = {}) {
        for (const executor of this.components) {
            const fun = (executor as any)[`${name}Command`];

            if (fun) {
                return executor.callMethod(fun, data);
            }
        }

        // this might hint at error, but sometimes this is used by components which are at different places
        // in the component tree to communicate with each other
        console.debug(`Unhandled command ${name}, converting to event.`);

        return this.triggerEvent(name, data);
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
