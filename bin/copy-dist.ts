import fs from "fs-extra";
import path from "path";

const DEST_DIR = "./build";

const VERBOSE = process.env.VERBOSE;

function log(...args: any[]) {
    if (VERBOSE) {
        console.log(...args);
    }
}

function copyNodeModuleFileOrFolder(source: string) {
    const destination = path.join(DEST_DIR, source);
    log(`Copying ${source} to ${destination}`);
    fs.ensureDirSync(path.dirname(destination));
    fs.copySync(source, destination);
}

try {

    const assetsToCopy = new Set([
        "./images",
        "./libraries",
        "./translations",
        "./db",
        "./config-sample.ini",
        "./package-lock.json",
        "./package.json",
        "./LICENSE",
        "./README.md",
        "./src/views/",
        "./src/etapi/etapi.openapi.yaml",
        "./src/routes/api/openapi.json",
        "./src/public/icon.png",
        "./src/public/manifest.webmanifest",
        "./src/public/robots.txt",
        "./src/public/fonts",
        "./src/public/stylesheets",
        "./src/public/translations"
    ]);

    for (const asset of assetsToCopy) {
        log(`Copying ${asset}`);
        fs.copySync(asset, path.join(DEST_DIR, asset));
    }

    /**
     * Directories to be copied relative to the project root into <resource_dir>/src/public/app-dist.
     */
    const publicDirsToCopy = ["./src/public/app/doc_notes"];
    const PUBLIC_DIR = path.join(DEST_DIR, "src", "public", "app-dist");
    for (const dir of publicDirsToCopy) {
        fs.copySync(dir, path.join(PUBLIC_DIR, path.basename(dir)));
    }

    const nodeModulesFile = new Set([
        "node_modules/react/umd/react.production.min.js",
        "node_modules/react/umd/react.development.js",
        "node_modules/react-dom/umd/react-dom.production.min.js",
        "node_modules/react-dom/umd/react-dom.development.js",
        "node_modules/katex/dist/katex.min.js",
        "node_modules/katex/dist/contrib/mhchem.min.js",
        "node_modules/katex/dist/contrib/auto-render.min.js",
        "node_modules/@highlightjs/cdn-assets/highlight.min.js",
        "node_modules/@mind-elixir/node-menu/dist/node-menu.umd.cjs"
    ]);

    const nodeModulesFolder = new Set([
        "node_modules/@excalidraw/excalidraw/dist/",
        "node_modules/katex/dist/",
        "node_modules/dayjs/",
        "node_modules/boxicons/css/",
        "node_modules/boxicons/fonts/",
        "node_modules/mermaid/dist/",
        "node_modules/jquery/dist/",
        "node_modules/jquery-hotkeys/",
        "node_modules/split.js/dist/",
        "node_modules/panzoom/dist/",
        "node_modules/i18next/",
        "node_modules/i18next-http-backend/",
        "node_modules/jsplumb/dist/",
        "node_modules/vanilla-js-wheel-zoom/dist/",
        "node_modules/mark.js/dist/",
        "node_modules/normalize.css/",
        "node_modules/jquery.fancytree/dist/",
        "node_modules/autocomplete.js/dist/",
        "node_modules/codemirror/lib/",
        "node_modules/codemirror/addon/",
        "node_modules/codemirror/mode/",
        "node_modules/codemirror/keymap/",
        "node_modules/mind-elixir/dist/",
        "node_modules/@highlightjs/cdn-assets/languages",
        "node_modules/@highlightjs/cdn-assets/styles",
        "node_modules/leaflet/dist"
    ]);



    for (const nodeModuleItem of [...nodeModulesFile, ...nodeModulesFolder]) {
        copyNodeModuleFileOrFolder(nodeModuleItem);
    }
    console.log("Copying complete!")

} catch(err) {
    console.error("Error during copy:", err)
}