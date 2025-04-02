import fs from "fs-extra";
import path from "path";

const DEST_DIR = "./build";

const VERBOSE = process.env.VERBOSE;

function log(...args: any[]) {
    if (VERBOSE) {
        console.log(...args);
    }
}

try {

    const assetsToCopy = new Set([
        // copy node_module, to avoid downloading packages a 2nd time during pruning
        "./node_modules",
        "./images",
        "./libraries",
        "./translations",
        "./db",
        "./config-sample.ini",
        "./package-lock.json",
        "./package.json",
        "./LICENSE",
        "./README.md",
        "./forge.config.cjs",
        "./bin/tpl/",
        "./bin/cleanupNodeModules.ts",
        "./bin/electron-forge/desktop.ejs",
        "./bin/electron-forge/sign-windows.cjs",
        "./src/views/",
        "./src/etapi/etapi.openapi.yaml",
        "./src/routes/api/openapi.json",
        "./src/public/icon.png",
        "./src/public/manifest.webmanifest",
        "./src/public/robots.txt",
        "./src/public/fonts",
        "./src/public/stylesheets",
        "./src/public/translations",
        "./packages/turndown-plugin-gfm/src"
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

    console.log("Copying complete!")

} catch(err) {
    console.error("Error during copy:", err)
    process.exit(1)
}

