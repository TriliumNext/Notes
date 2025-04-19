import assetPath from "../services/asset_path.js";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { isDev, isElectron } from "../services/utils.js";
import type serveStatic from "serve-static";

const persistentCacheStatic = (root: string, options?: serveStatic.ServeStaticOptions<express.Response<unknown, Record<string, unknown>>>) => {
    if (!isDev) {
        options = {
            maxAge: "1y",
            ...options
        };
    }
    return express.static(root, options);
};

async function register(app: express.Application) {
    const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    if (isDev) {
        app.use(`/${assetPath}/app/doc_notes`, persistentCacheStatic(path.join(srcRoot, "public/app/doc_notes")));
        app.use(`/${assetPath}/app`, persistentCacheStatic(path.join(srcRoot, "../../client/build")));
        app.use(`/${assetPath}/app-dist`, persistentCacheStatic(path.join(srcRoot, "../../client/build")));
        app.use(`/${assetPath}/stylesheets`, persistentCacheStatic(path.join(srcRoot, "../../client/stylesheets")));
        app.use(`/${assetPath}/libraries`, persistentCacheStatic(path.join(srcRoot, "../../client/libraries")));
    } else {
        app.use(`/${assetPath}/app`, persistentCacheStatic(path.join(srcRoot, "public/app")));
        app.use(`/${assetPath}/app-dist`, persistentCacheStatic(path.join(srcRoot, "public/app-dist")));
        app.use(`/${assetPath}/stylesheets`, persistentCacheStatic(path.join(srcRoot, "public/stylesheets")));
    }
    app.use(`/${assetPath}/fonts`, persistentCacheStatic(path.join(srcRoot, "public/fonts")));
    app.use(`/assets/vX/fonts`, express.static(path.join(srcRoot, "public/fonts")));
    app.use(`/${assetPath}/images`, persistentCacheStatic(path.join(srcRoot, "..", "images")));
    app.use(`/assets/vX/images`, express.static(path.join(srcRoot, "..", "images")));    
    app.use(`/assets/vX/stylesheets`, express.static(path.join(srcRoot, "public/stylesheets")));
    app.use(`/${assetPath}/libraries`, persistentCacheStatic(path.join(srcRoot, "public/libraries")));
    app.use(`/assets/vX/libraries`, express.static(path.join(srcRoot, "..", "libraries")));

    const nodeModulesDir = isDev ? path.join(srcRoot, "..", "..", "..", "node_modules") : path.join(srcRoot, "..", "node_modules");

    app.use(`/node_modules/@excalidraw/excalidraw/dist/fonts/`, express.static(path.join(nodeModulesDir, "@excalidraw/excalidraw/dist/prod/fonts/")));
    app.use(`/${assetPath}/node_modules/@excalidraw/excalidraw/dist/fonts/`, persistentCacheStatic(path.join(nodeModulesDir, "@excalidraw/excalidraw/dist/prod/fonts/")));

    // KaTeX
    app.use(`/${assetPath}/node_modules/katex/dist/katex.min.js`, persistentCacheStatic(path.join(nodeModulesDir, "katex/dist/katex.min.js")));
    app.use(`/${assetPath}/node_modules/katex/dist/contrib/mhchem.min.js`, persistentCacheStatic(path.join(nodeModulesDir, "katex/dist/contrib/mhchem.min.js")));
    app.use(`/${assetPath}/node_modules/katex/dist/contrib/auto-render.min.js`, persistentCacheStatic(path.join(nodeModulesDir, "katex/dist/contrib/auto-render.min.js")));
    // expose the whole dist folder
    app.use(`/node_modules/katex/dist/`, express.static(path.join(nodeModulesDir, "katex/dist/")));
    app.use(`/${assetPath}/node_modules/katex/dist/`, persistentCacheStatic(path.join(nodeModulesDir, "katex/dist/")));

    app.use(`/${assetPath}/node_modules/boxicons/css/`, persistentCacheStatic(path.join(nodeModulesDir, "boxicons/css/")));
    app.use(`/${assetPath}/node_modules/boxicons/fonts/`, persistentCacheStatic(path.join(nodeModulesDir, "boxicons/fonts/")));

    app.use(`/${assetPath}/node_modules/jquery/dist/`, persistentCacheStatic(path.join(nodeModulesDir, "jquery/dist/")));

    app.use(`/${assetPath}/node_modules/jquery-hotkeys/`, persistentCacheStatic(path.join(nodeModulesDir, "jquery-hotkeys/")));

    // i18n
    app.use(`/${assetPath}/translations/`, persistentCacheStatic(path.join(srcRoot, "public", "translations/")));

    app.use(`/${assetPath}/node_modules/eslint/bin/`, persistentCacheStatic(path.join(nodeModulesDir, "eslint/bin/")));

    // Deprecated, https://www.npmjs.com/package/autocomplete.js?activeTab=readme
    app.use(`/${assetPath}/node_modules/autocomplete.js/dist/`, persistentCacheStatic(path.join(nodeModulesDir, "autocomplete.js/dist/")));

    app.use(`/${assetPath}/node_modules/normalize.css/`, persistentCacheStatic(path.join(nodeModulesDir, "normalize.css/")));

    app.use(`/${assetPath}/node_modules/jquery.fancytree/dist/`, persistentCacheStatic(path.join(nodeModulesDir, "jquery.fancytree/dist/")));

    // CodeMirror
    app.use(`/${assetPath}/node_modules/codemirror/lib/`, persistentCacheStatic(path.join(nodeModulesDir, "codemirror/lib/")));
    app.use(`/${assetPath}/node_modules/codemirror/addon/`, persistentCacheStatic(path.join(nodeModulesDir, "codemirror/addon/")));
    app.use(`/${assetPath}/node_modules/codemirror/mode/`, persistentCacheStatic(path.join(nodeModulesDir, "codemirror/mode/")));
    app.use(`/${assetPath}/node_modules/codemirror/keymap/`, persistentCacheStatic(path.join(nodeModulesDir, "codemirror/keymap/")));

    app.use(`/${assetPath}/node_modules/@highlightjs/cdn-assets/`, persistentCacheStatic(path.join(nodeModulesDir, "@highlightjs/cdn-assets/")));
}

export default {
    register
};
