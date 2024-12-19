import type FNote from "./entities/fnote";
import type { BackendModule, i18n } from "i18next";
import type { Froca } from "./services/froca-interface";
import type { HttpBackendOptions } from "i18next-http-backend";

interface ElectronProcess {
    type: string;
    platform: string;
}

interface CustomGlobals {
    isDesktop: boolean;
    isMobile: boolean;
    device: "mobile" | "desktop";
    getComponentsByEl: (el: unknown) => unknown;
    getHeaders: Promise<Record<string, string>>;
    getReferenceLinkTitle: (href: string) => Promise<string>;
    getReferenceLinkTitleSync: (href: string) => string;
    getActiveContextNote: FNote;
    requireLibrary: (library: string) => Promise<void>;
    ESLINT: { js: string[]; };
    appContext: AppContext;
    froca: Froca;
    treeCache: Froca;
    importMarkdownInline: () => Promise<unknown>;
    SEARCH_HELP_TEXT: string;
    activeDialog: JQuery<HTMLElement> | null;
    componentId: string;
    csrfToken: string;
    baseApiUrl: string;
    isProtectedSessionAvailable: boolean;
    isDev: boolean;
    isMainWindow: boolean;
    maxEntityChangeIdAtLoad: number;
    maxEntityChangeSyncIdAtLoad: number;
    assetPath: string;
    instanceName: string;
}

type RequireMethod = (moduleName: string) => any;

declare global {
    interface Window {
        logError(message: string);
        logInfo(message: string);
    
        process?: ElectronProcess;
        glob?: CustomGlobals;
    }

    interface AutoCompleteConfig {
        appendTo?: HTMLElement | null;
        hint?: boolean;
        openOnFocus?: boolean;
        minLength?: number;
        tabAutocomplete?: boolean
    }

    type AutoCompleteCallback = (values: AutoCompleteCallbackArgs[]) => void;

    interface AutoCompleteArg {
        displayKey: "name" | "value";
        cache: boolean;
        source: (term: string, cb: AutoCompleteCallback) => void
    };
    
    interface JQuery {
        autocomplete: (action: "close" | "open" | "destroy" | AutoCompleteConfig, args?: AutoCompleteArg[]) => void;        
    }

    var logError: (message: string) => void;
    var logInfo: (message: string) => void;
    var glob: CustomGlobals;
    var require: RequireMethod;
    var __non_webpack_require__: RequireMethod | undefined;

    // Libraries
    // TODO: Replace once library loader is replaced with webpack.
    var i18next: i18n;
    var i18nextHttpBackend: BackendModule<HttpBackendOptions>;
    var hljs: {
        highlightAuto(text: string);
        highlight(text: string, {
            language: string
        });
    };
    var dayjs: {};
    var Split: (selectors: string[], config: {
        sizes: [ number, number ];
        gutterSize: number;
        onDragEnd: (sizes: [ number, number ]) => void;
    }) => {
        destroy();
    };
}
