import FNote from "./entities/fnote";

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
}

type RequireMethod = (moduleName: string) => any;

declare global {
    interface Window {
        logError(message: string);
        logInfo(message: string);
    
        process?: ElectronProcess;
        glob?: CustomGlobals;
    }

    interface JQuery {
        autocomplete: (action: "close") => void;
    }

    declare var logError: (message: string) => void;
    declare var logInfo: (message: string) => void;
    declare var glob: CustomGlobals;
    declare var require: RequireMethod;
    declare var __non_webpack_require__: RequireMethod | undefined;
}
