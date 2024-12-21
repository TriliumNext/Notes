import type FNote from "./entities/fnote";
import type { BackendModule, i18n } from "i18next";
import type { Froca } from "./services/froca-interface";
import type { HttpBackendOptions } from "i18next-http-backend";
import { Suggestion } from "./services/note_autocomplete.ts";
import utils from "./services/utils.ts";
import appContext from "./components/app_context.ts";
import server from "./services/server.ts";
import library_loader, { Library } from "./services/library_loader.ts";

interface ElectronProcess {
    type: string;
    platform: string;
}

interface CustomGlobals {
    isDesktop: typeof utils.isDesktop;
    isMobile: typeof utils.isMobile;
    device: "mobile" | "desktop";
    getComponentByEl: typeof appContext.getComponentByEl;
    getHeaders: typeof server.getHeaders;
    getReferenceLinkTitle: (href: string) => Promise<string>;
    getReferenceLinkTitleSync: (href: string) => string;
    getActiveContextNote: FNote;
    requireLibrary: typeof library_loader.requireLibrary;
    ESLINT: Library;
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
    appCssNoteIds: string[];
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
        tabAutocomplete?: boolean;
        autoselect?: boolean;
        dropdownMenuContainer?: HTMLElement;
        debug?: boolean;
    }

    type AutoCompleteCallback = (values: AutoCompleteCallbackArg[]) => void;

    interface AutoCompleteArg {
        displayKey: "name" | "value" | "notePathTitle";
        cache: boolean;
        source: (term: string, cb: AutoCompleteCallback) => void,
        templates?: {
            suggestion: (suggestion: Suggestion) => string | undefined
        }
    };
    
    interface JQuery {
        autocomplete: (action?: "close" | "open" | "destroy" | "val" | AutoCompleteConfig, args?: AutoCompleteArg[] | string) => JQuery<?>;
        
        getSelectedNotePath(): string | undefined;
        getSelectedNoteId(): string | null;
        setSelectedNotePath(notePath: string | null | undefined);
        getSelectedExternalLink(this: HTMLElement): string | undefined;
        setSelectedExternalLink(externalLink: string | null | undefined);
        setNote(noteId: string);
    }

    var logError: (message: string, e?: Error) => void;
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
    var renderMathInElement: (element: HTMLElement, options: {
        trust: boolean;
    }) => void;
    var WZoom = {
        create(selector: string, opts: {
            maxScale: number;
            speed: number;
            zoomOnClick: boolean
        })
    };
    interface MermaidApi {
        initialize(opts: {
            startOnLoad: boolean,
            theme: string,
            securityLevel: "antiscript"
        }): void;
        render(selector: string, data: string);
    }
    var mermaid: {        
        mermaidAPI: MermaidApi;
    };
}
