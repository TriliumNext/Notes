const CKEDITOR = {"js": ["libraries/ckeditor/ckeditor.js"]};

const CODE_MIRROR = {
    js: [
        "libraries/codemirror/codemirror.js",
        // "node_modules/codemirror/lib/codemirror.js",
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
    ],
    css: [
        "node_modules/codemirror/lib/codemirror.css",
        "node_modules/codemirror/addon/lint/lint.css"
    ]
};

const ESLINT = {js: ["node_modules/eslint/bin/eslint.js"]};

const RELATION_MAP = {
    js: [
        "node_modules/jsplumb/dist/js/jsplumb.min.js",
        "node_modules/panzoom/dist/panzoom.min.js"
    ],
    css: [
        "stylesheets/relation_map.css"
    ]
};

const PRINT_THIS = {js: ["node_modules/print-this/printThis.js"]};

const CALENDAR_WIDGET = {css: ["stylesheets/calendar.css"]};

const KATEX = {
    js: [ "node_modules/katex/dist/katex.min.js",
        "node_modules/katex/dist/contrib/mhchem.min.js",
        "node_modules/katex/dist/contrib/auto-render.min.js" ],
    css: [ "node_modules/katex/dist/katex.min.css" ]
};

const WHEEL_ZOOM = {
    js: [ "node_modules/vanilla-js-wheel-zoom/dist/wheel-zoom.min.js"]
};

const FORCE_GRAPH = {
    js: [ "node_modules/force-graph/dist/force-graph.min.js"]
};

const MERMAID = {
    js: [ "node_modules/mermaid/dist/mermaid.min.js" ]
}

const EXCALIDRAW = {
    js: [
        "node_modules/react/umd/react.production.min.js",
        "node_modules/react-dom/umd/react-dom.production.min.js",
        "node_modules/@excalidraw/excalidraw/dist/excalidraw.production.min.js",
    ]
};

const MARKJS = {
    js: [
        "node_modules/mark.js/dist/jquery.mark.es6.min.js"
    ]
};

const I18NEXT = {
    js: [
        "node_modules/i18next/i18next.min.js",
        "node_modules/i18next-http-backend/i18nextHttpBackend.min.js"
    ]
};

const MIND_ELIXIR = {
    js: [
        "node_modules/mind-elixir/dist/MindElixir.iife.js"
    ]
};

async function requireLibrary(library) {
    if (library.css) {
        library.css.map(cssUrl => requireCss(cssUrl));
    }

    if (library.js) {
        for (const scriptUrl of library.js) {
            await requireScript(scriptUrl);
        }
    }
}

// we save the promises in case of the same script being required concurrently multiple times
const loadedScriptPromises = {};

async function requireScript(url) {
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

async function requireCss(url, prependAssetPath = true) {
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

export default {
    requireCss,
    requireLibrary,
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
    EXCALIDRAW,
    MARKJS,
    I18NEXT,
    MIND_ELIXIR
}
