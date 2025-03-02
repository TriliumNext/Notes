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
            "node_modules/codemirror/keymap/vim.js",
            "libraries/codemirror/eslint.js"
        ];

        const mimeTypes = mimeTypesService.getMimeTypes();
        for (const mimeType of mimeTypes) {
            if (mimeType.enabled && mimeType.codeMirrorSource) {
                scriptsToLoad.push(mimeType.codeMirrorSource);
            }
        }

        return scriptsToLoad;
    },
    css: ["node_modules/codemirror/lib/codemirror.css", "node_modules/codemirror/addon/lint/lint.css"]
};

const ESLINT: Library = {
    js: ["libraries/eslint/eslint.js"]
};

const RELATION_MAP: Library = {
    js: ["node_modules/jsplumb/dist/js/jsplumb.min.js", "node_modules/panzoom/dist/panzoom.min.js"],
    css: ["stylesheets/relation_map.css"]
};

const CALENDAR_WIDGET: Library = {
    css: ["stylesheets/calendar.css"]
};

const KATEX: Library = {
    js: ["node_modules/katex/dist/katex.min.js", "node_modules/katex/dist/contrib/mhchem.min.js", "node_modules/katex/dist/contrib/auto-render.min.js"],
    css: ["node_modules/katex/dist/katex.min.css"]
};

const WHEEL_ZOOM: Library = {
    js: ["node_modules/vanilla-js-wheel-zoom/dist/wheel-zoom.min.js"]
};

const MERMAID: Library = {
    js: ["node_modules/mermaid/dist/mermaid.min.js"]
};

const MARKJS: Library = {
    js: ["node_modules/mark.js/dist/jquery.mark.es6.min.js"]
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

const LEAFLET: Library = {
    css: [ "node_modules/leaflet/dist/leaflet.css" ],
}

async function requireLibrary(library: Library) {
    if (library.css) {
        library.css.map((cssUrl) => requireCss(cssUrl));
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
    const cssLinks = Array.from(document.querySelectorAll("link")).map((el) => el.href);

    if (!cssLinks.some((l) => l.endsWith(url))) {
        if (prependAssetPath) {
            url = `${window.glob.assetPath}/${url}`;
        }

        $("head").append($('<link rel="stylesheet" type="text/css" />').attr("href", url));
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
    CALENDAR_WIDGET,
    KATEX,
    WHEEL_ZOOM,
    MERMAID,
    MARKJS,
    HIGHLIGHT_JS,
    LEAFLET
};
