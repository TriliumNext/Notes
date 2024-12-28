import mimeTypesService from "./mime_types.js";
import optionsService from "./options.js";
import { getStylesheetUrl } from "./syntax_highlight.js";

export interface Library {
    js?: string[] | (() => string[]);
    css?: string[];
}

const CKEDITOR: Library = {
    js: ["libraries/ckeditor/ckeditor.js"]
};

const CODE_MIRROR: Library = {
    js: () => {
        const scriptsToLoad = [
            "node_modules/codemirror/lib/codemirror.js",
            "node_modules/codemirror/addon/display/placeholder.js",
            "node_modules/codemirror/addon/edit/matchbrackets.js",
            "node_modules/codemirror/addon/edit/matchtags.js",
            "node_modules/codemirror/addon/fold/xml-fold.js",
            "node_modules/codemirror/addon/lint/lint.js",
            "node_modules/codemirror/addon/mode/loadmode.js",
            "node_modules/codemirror/addon/mode/multiplex.js",
            "node_modules/codemirror/addon/mode/overlay.js",
            "node_modules/codemirror/addon/mode/simple.js",
            "node_modules/codemirror/addon/search/match-highlighter.js",
            "node_modules/codemirror/mode/meta.js",
            "node_modules/codemirror/keymap/vim.js"
        ];

        const mimeTypes = mimeTypesService.getMimeTypes();
        for (const mimeType of mimeTypes) {
            if (mimeType.codeMirrorSource) {
                scriptsToLoad.push(mimeType.codeMirrorSource);
            }
        }

        return scriptsToLoad;
    },
    css: [
        "node_modules/codemirror/lib/codemirror.css",
        "node_modules/codemirror/addon/lint/lint.css"
    ]
};

const ESLINT: Library = {
    js: [
        "node_modules/eslint/bin/eslint.js"
    ]
};

const RELATION_MAP: Library = {
    js: [
        "node_modules/jsplumb/dist/js/jsplumb.min.js",
        "node_modules/panzoom/dist/panzoom.min.js"
    ],
    css: [
        "stylesheets/relation_map.css"
    ]
};

const PRINT_THIS: Library = {
    js: ["node_modules/print-this/printThis.js"]
};

const CALENDAR_WIDGET: Library = {
    css: ["stylesheets/calendar.css"]
};

const KATEX: Library = {
    js: [ "node_modules/katex/dist/katex.min.js",
        "node_modules/katex/dist/contrib/mhchem.min.js",
        "node_modules/katex/dist/contrib/auto-render.min.js" ],
    css: [ "node_modules/katex/dist/katex.min.css" ]
};

const WHEEL_ZOOM: Library = {
    js: [ "node_modules/vanilla-js-wheel-zoom/dist/wheel-zoom.min.js"]
};

const FORCE_GRAPH: Library = {
    js: [ "node_modules/force-graph/dist/force-graph.min.js"]
};

const MERMAID: Library = {
    js: [
        "node_modules/mermaid/dist/mermaid.min.js"
    ]
}

/**
 * The ELK extension of Mermaid.js, which supports more advanced layouts.
 * See https://www.npmjs.com/package/@mermaid-js/layout-elk for more information.
 */
const MERMAID_ELK: Library = {
    js: [
        "libraries/mermaid-elk/elk.min.js"
    ]
}

const EXCALIDRAW: Library = {
    js: [
        "node_modules/react/umd/react.production.min.js",
        "node_modules/react-dom/umd/react-dom.production.min.js",
        "node_modules/@excalidraw/excalidraw/dist/excalidraw.production.min.js",
    ]
};

const MARKJS: Library = {
    js: [
        "node_modules/mark.js/dist/jquery.mark.es6.min.js"
    ]
};

const I18NEXT: Library = {
    js: [
        "node_modules/i18next/i18next.min.js",
        "node_modules/i18next-http-backend/i18nextHttpBackend.min.js"
    ]
};

const MIND_ELIXIR: Library = {
    js: [
        "node_modules/mind-elixir/dist/MindElixir.iife.js",
        "node_modules/@mind-elixir/node-menu/dist/node-menu.umd.cjs"
    ]
};

const HIGHLIGHT_JS: Library = {
    js: () => {
        const mimeTypes = mimeTypesService.getMimeTypes();
        const scriptsToLoad = new Set<string>();
        scriptsToLoad.add("node_modules/@highlightjs/cdn-assets/highlight.min.js");
        for (const mimeType of mimeTypes) {
            const id = mimeType.highlightJs;
            if (!mimeType.enabled || !id) {
                continue;
            }

            if (mimeType.highlightJsSource === "libraries") {
                scriptsToLoad.add(`libraries/highlightjs/${id}.js`);
            } else {
                // Built-in module.
                scriptsToLoad.add(`node_modules/@highlightjs/cdn-assets/languages/${id}.min.js`);
            }
        }

        const currentTheme = String(optionsService.get("codeBlockTheme"));
        loadHighlightingTheme(currentTheme);

        return Array.from(scriptsToLoad);
    }
};

async function requireLibrary(library: Library) {
    if (library.css) {
        library.css.map(cssUrl => requireCss(cssUrl));
    }

    if (library.js) {
        for (const scriptUrl of unwrapValue(library.js)) {
            await requireScript(scriptUrl);
        }
    }
}

function unwrapValue<T>(value: T | (() => T)) {
    if (typeof value === "function") {
        return (value as () => T)();
    }

    return value;
}

// we save the promises in case of the same script being required concurrently multiple times
const loadedScriptPromises: Record<string, JQuery.jqXHR> = {};

async function requireScript(url: string) {
    url = `${window.glob.assetPath}/${url}`;

    if (!loadedScriptPromises[url]) {
        loadedScriptPromises[url] = $.ajax({
            url: url,
            dataType: "script",
            cache: true
        });
    }

    await loadedScriptPromises[url];
}

async function requireCss(url: string, prependAssetPath = true) {
    const cssLinks = Array
        .from(document.querySelectorAll('link'))
        .map(el => el.href);

    if (!cssLinks.some(l => l.endsWith(url))) {
        if (prependAssetPath) {
            url = `${window.glob.assetPath}/${url}`;
        }

        $('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', url));
    }
}

let highlightingThemeEl: JQuery<HTMLElement> | null = null;
function loadHighlightingTheme(theme: string) {
    if (!theme) {
        return;
    }

    if (theme === "none") {
        // Deactivate the theme.
        if (highlightingThemeEl) {
            highlightingThemeEl.remove();
            highlightingThemeEl = null;
        }
        return;
    }

    if (!highlightingThemeEl) {
        highlightingThemeEl = $(`<link rel="stylesheet" type="text/css" />`);
        $("head").append(highlightingThemeEl);
    }

    const url = getStylesheetUrl(theme);
    if (url) {
        highlightingThemeEl.attr("href", url);
    }
}

export default {
    requireCss,
    requireLibrary,
    loadHighlightingTheme,
    CKEDITOR,
    CODE_MIRROR,
    ESLINT,
    RELATION_MAP,
    PRINT_THIS,
    CALENDAR_WIDGET,
    KATEX,
    WHEEL_ZOOM,
    FORCE_GRAPH,
    MERMAID,
    MERMAID_ELK,
    EXCALIDRAW,
    MARKJS,
    I18NEXT,
    MIND_ELIXIR,
    HIGHLIGHT_JS
}
