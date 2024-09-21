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

bundleService.getWidgetBundlesByParent().then(async widgetBundles => {
    await appContext.earlyInit();
    
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
    utils.dynamicRequire('electron').ipcRenderer.on('globalShortcut',
        async (event, actionName) => appContext.triggerCommand(actionName));
}

macInit.init();

noteTooltipService.setupGlobalTooltip();

noteAutocompleteService.init();

if (utils.isElectron()) {
    electronContextMenu.setupContextMenu();
}
