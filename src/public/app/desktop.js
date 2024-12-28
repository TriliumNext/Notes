import appContext from "./components/app_context.js";
import utils from './services/utils.js';
import noteTooltipService from './services/note_tooltip.js';
import bundleService from "./services/bundle.js";
import toastService from "./services/toast.js";
import noteAutocompleteService from './services/note_autocomplete.js';
import macInit from './services/mac_init.js';
import electronContextMenu from "./menus/electron_context_menu.js";
import glob from "./services/glob.js";
import { t } from "./services/i18n.js";
import options from "./services/options.js";

await appContext.earlyInit();

bundleService.getWidgetBundlesByParent().then(async widgetBundles => {
    // A dynamic import is required for layouts since they initialize components which require translations.
    const DesktopLayout = (await import("./layouts/desktop_layout.js")).default;

    appContext.setLayout(new DesktopLayout(widgetBundles));
    appContext.start()
        .catch((e) => {
            toastService.showPersistent({
                title: t("toast.critical-error.title"),
                icon: "alert",
                message: t("toast.critical-error.message", { message: e.message }),
            });
            console.error("Critical error occured", e);
        });
});

glob.setupGlobs();

if (utils.isElectron()) {
    initOnElectron();
}

macInit.init();

noteTooltipService.setupGlobalTooltip();

noteAutocompleteService.init();

if (utils.isElectron()) {
    electronContextMenu.setupContextMenu();
}

function initOnElectron() {
    const electron = utils.dynamicRequire('electron');
    electron.ipcRenderer.on('globalShortcut', async (event, actionName) => appContext.triggerCommand(actionName));

    const electronRemote = utils.dynamicRequire("@electron/remote");
    const currentWindow = electronRemote.getCurrentWindow();
    const style = window.getComputedStyle(document.body);

    initTransparencyEffects(style, currentWindow);

    if (options.get("nativeTitleBarVisible") !== "true") {
        initTitleBarButtons(style, currentWindow);
    }
}

function initTitleBarButtons(style, currentWindow) {
    if (window.glob.platform === "win32") {
        const applyWindowsOverlay = () => {
            const color = style.getPropertyValue("--native-titlebar-background");
            const symbolColor = style.getPropertyValue("--native-titlebar-foreground");
            if (color && symbolColor) {
                currentWindow.setTitleBarOverlay({ color, symbolColor });
            }
        };

        applyWindowsOverlay();

        // Register for changes to the native title bar colors.
        window.matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", applyWindowsOverlay);
    }

    if (window.glob.platform === "darwin") {
        const xOffset = parseInt(style.getPropertyValue("--native-titlebar-darwin-x-offset"), 10);
        const yOffset = parseInt(style.getPropertyValue("--native-titlebar-darwin-y-offset"), 10);
        currentWindow.setWindowButtonPosition({ x: xOffset, y: yOffset });
    }
}

function initTransparencyEffects(style, currentWindow) {
    if (window.glob.platform === "win32") {
        const material = style.getPropertyValue("--background-material");
        currentWindow.setBackgroundMaterial(material);
    }
}
