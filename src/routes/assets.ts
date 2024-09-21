import assetPath from "../services/asset_path.js";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import env from "../services/env.js";
import serveStatic from "serve-static";

const persistentCacheStatic = (root: string, options?: serveStatic.ServeStaticOptions<express.Response<any, Record<string, any>>>) => {
    if (!env.isDev()) {
        options = {
            maxAge: '1y',
            ...options
        };
    }
    return express.static(root, options);
};

function register(app: express.Application) {
    const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
    app.use(`/${assetPath}/app`, persistentCacheStatic(path.join(srcRoot, 'public/app')));
    app.use(`/${assetPath}/app-dist`, persistentCacheStatic(path.join(srcRoot, 'public/app-dist')));
    app.use(`/${assetPath}/fonts`, persistentCacheStatic(path.join(srcRoot, 'public/fonts')));
    app.use(`/assets/vX/fonts`, express.static(path.join(srcRoot, 'public/fonts')));
    app.use(`/${assetPath}/images`, persistentCacheStatic(path.join(srcRoot, '..', 'images')));
    app.use(`/assets/vX/images`, express.static(path.join(srcRoot, '..', 'images')));
    app.use(`/${assetPath}/stylesheets`, persistentCacheStatic(path.join(srcRoot, 'public/stylesheets')));
    app.use(`/assets/vX/stylesheets`, express.static(path.join(srcRoot, 'public/stylesheets')));
    app.use(`/${assetPath}/libraries`, persistentCacheStatic(path.join(srcRoot, '..', 'libraries')));
    app.use(`/assets/vX/libraries`, express.static(path.join(srcRoot, '..', 'libraries')));

    // excalidraw-view mode in shared notes
    app.use(`/${assetPath}/node_modules/react/umd/react.production.min.js`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/react/umd/react.production.min.js')));
    app.use(`/${assetPath}/node_modules/react/umd/react.development.js`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/react/umd/react.development.js')));
    app.use(`/${assetPath}/node_modules/react-dom/umd/react-dom.production.min.js`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/react-dom/umd/react-dom.production.min.js')));
    app.use(`/${assetPath}/node_modules/react-dom/umd/react-dom.development.js`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/react-dom/umd/react-dom.development.js')));
    // expose the whole dist folder since complete assets are needed in edit and share
    app.use(`/node_modules/@excalidraw/excalidraw/dist/`, express.static(path.join(srcRoot, '..', 'node_modules/@excalidraw/excalidraw/dist/')));
    app.use(`/${assetPath}/node_modules/@excalidraw/excalidraw/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/@excalidraw/excalidraw/dist/')));

    // KaTeX
    app.use(
      `/${assetPath}/node_modules/katex/dist/katex.min.js`,
      persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/katex/dist/katex.min.js')));
    app.use(
      `/${assetPath}/node_modules/katex/dist/contrib/mhchem.min.js`,
      persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/katex/dist/contrib/mhchem.min.js')));
    app.use(
      `/${assetPath}/node_modules/katex/dist/contrib/auto-render.min.js`,
      persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/katex/dist/contrib/auto-render.min.js')));
    // expose the whole dist folder
    app.use(`/node_modules/katex/dist/`,
      express.static(path.join(srcRoot, '..', 'node_modules/katex/dist/')));
    app.use(`/${assetPath}/node_modules/katex/dist/`,
      persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/katex/dist/')));

    app.use(`/${assetPath}/node_modules/dayjs/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/dayjs/')));
    app.use(`/${assetPath}/node_modules/force-graph/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/force-graph/dist/')));

    app.use(`/${assetPath}/node_modules/boxicons/css/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/boxicons/css/')));
    app.use(`/${assetPath}/node_modules/boxicons/fonts/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/boxicons/fonts/')));

    app.use(`/${assetPath}/node_modules/mermaid/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/mermaid/dist/')));

    app.use(`/${assetPath}/node_modules/jquery/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/jquery/dist/')));

    app.use(`/${assetPath}/node_modules/jquery-hotkeys/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/jquery-hotkeys/')));

    app.use(`/${assetPath}/node_modules/print-this/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/print-this/')));

    app.use(`/${assetPath}/node_modules/split.js/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/split.js/dist/')));

    app.use(`/${assetPath}/node_modules/panzoom/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/panzoom/dist/')));

    // i18n
    app.use(`/${assetPath}/node_modules/i18next/`, persistentCacheStatic(path.join(srcRoot, "..", 'node_modules/i18next/')));
    app.use(`/${assetPath}/node_modules/i18next-http-backend/`, persistentCacheStatic(path.join(srcRoot, "..", 'node_modules/i18next-http-backend/')));
    app.use(`/${assetPath}/translations/`, persistentCacheStatic(path.join(srcRoot, "public", "translations/")));

    app.use(`/${assetPath}/node_modules/eslint/bin/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/eslint/bin/')));

    app.use(`/${assetPath}/node_modules/jsplumb/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/jsplumb/dist/')));

    app.use(`/${assetPath}/node_modules/vanilla-js-wheel-zoom/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/vanilla-js-wheel-zoom/dist/')));
    
    app.use(`/${assetPath}/node_modules/mark.js/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/mark.js/dist/')));
    
    // Deprecated, https://www.npmjs.com/package/autocomplete.js?activeTab=readme
    app.use(`/${assetPath}/node_modules/autocomplete.js/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/autocomplete.js/dist/')));

    app.use(`/${assetPath}/node_modules/knockout/build/output/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/knockout/build/output/')));

    app.use(`/${assetPath}/node_modules/normalize.css/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/normalize.css/')));

    app.use(`/${assetPath}/node_modules/jquery.fancytree/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/jquery.fancytree/dist/')));

    app.use(`/${assetPath}/node_modules/bootstrap/dist/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/bootstrap/dist/')));

    // CodeMirror
    app.use(`/${assetPath}/node_modules/codemirror/lib/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/codemirror/lib/')));
    app.use(`/${assetPath}/node_modules/codemirror/addon/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/codemirror/addon/')));
    app.use(`/${assetPath}/node_modules/codemirror/mode/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/codemirror/mode/')));
    app.use(`/${assetPath}/node_modules/codemirror/keymap/`, persistentCacheStatic(path.join(srcRoot, '..', 'node_modules/codemirror/keymap/')));

    app.use(`/${assetPath}/node_modules/mind-elixir/dist/`, persistentCacheStatic(path.join(srcRoot, "..", "node_modules/mind-elixir/dist/")));
}

export default {
    register
};
