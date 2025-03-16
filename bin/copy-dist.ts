import fs from "fs-extra";
import path from "path";
import { execSync } from "node:child_process";

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
        "./bin/electron-forge/desktop.ejs",
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

    console.log("Copying complete!")

    // TriliumNextTODO: for Docker this needs to run separately *after* build-stage
    console.log("Pruning npm packages...")
    execSync(`npm ci --omit=dev --prefix ${DEST_DIR}`);

    cleanupNodeModules();

} catch(err) {
    console.error("Error during copy:", err)
    process.exit(1)
}
function cleanupNodeModules() {
    const nodeDir = fs.readdirSync(path.join(DEST_DIR, "./node_modules"), { recursive: true, withFileTypes: true });

    const filterableDirs = new Set([
        "demo",
        "demos",
        "doc",
        "docs",
        "example",
        "examples",
        "test",
        "tests"
    ]);

    const filteredDirs = nodeDir
        .filter(el => el.isDirectory() && filterableDirs.has(el.name))
        .map(el => path.join(DEST_DIR, el.parentPath, el.name));

    filteredDirs.forEach(dir => {
        fs.removeSync(dir);
    })

}

