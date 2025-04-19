import fs from "fs-extra";
import path from "path";

const DEST_DIR = "./build";

const VERBOSE = process.env.VERBOSE;

function log(...args: any[]) {
    if (VERBOSE) {
        console.log(...args);
    }
}

import { fileURLToPath } from "url";
import { dirname } from "path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..", "..");
const clientDir = path.join(rootDir, "apps", "client");
const serverDir = path.join(rootDir, "apps", "server");

function copyAssets(baseDir: string, destDir: string, files: string[]) {
    for (const file of files) {
        const src = path.join(baseDir, file);
        const dest = path.join(destDir, file);
        log(`${src} -> ${dest}`);
        fs.copySync(src, dest);
    }
}

/**
 * Copies the dependencies from the node_modules directory to the build directory.
 * We cannot copy the node_modules directory directly because we are in a monorepo and all the packages are gathered at root level.
 * 
 * @param packageJsonPath 
 */
function copyNodeModules(packageJsonPath: string) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const dependencies = packageJson.dependencies || {};

    for (const dependency of Object.keys(dependencies)) {
        if (dependency.startsWith("@triliumnext/")) {
            // Skip copying @triliumnext dependencies since they are symlinked in the monorepo.
            continue;
        }

        const src = path.join(rootDir, "node_modules", dependency);
        const dest = path.join(DEST_DIR, "node_modules", dependency);
        log(`${src} -> ${dest}`);
        fs.copySync(src, dest);
    }
}

try {
    const clientAssets = [
        "./libraries",
        `./stylesheets`
    ];

    const serverAssets = [
        // copy node_module, to avoid downloading packages a 2nd time during pruning
        "./node_modules",
        "./assets",
        "./translations",
        "./db",
        "./config-sample.ini",
        "./package.json",
        "./src/public/icon.png",
        "./src/public/manifest.webmanifest",
        "./src/public/robots.txt",
        "./src/public/fonts",
        "./src/public/translations",
        `./tpl/`,
        "./scripts/cleanupNodeModules.ts",        
        "./src/views/",
        "./src/etapi/etapi.openapi.yaml",
        "./src/routes/api/openapi.json",
    ];

    const rootAssets = [
        "LICENSE",
        "README.md"    
    ];

    copyNodeModules(path.join(serverDir, "package.json"));
    copyAssets(clientDir, path.join(DEST_DIR, "src", "public"), clientAssets);
    copyAssets(serverDir, path.join(DEST_DIR), serverAssets);
    copyAssets(rootDir, path.join(DEST_DIR), rootAssets);

    /**
     * Directories to be copied relative to the project root into <resource_dir>/src/public/app-dist.
     */
    const publicDirsToCopy = ["./src/public/app/doc_notes"];
    const PUBLIC_DIR = path.join(DEST_DIR, "src", "public", "app-dist");
    for (const dir of publicDirsToCopy) {
        fs.copySync(dir, path.normalize(path.join(PUBLIC_DIR, path.basename(dir))));
    }

    fs.copySync(path.join(clientDir, "build"), path.join(DEST_DIR, "src", "public", "app-dist"));
    fs.copySync(path.join(rootDir, "packages", "turndown-plugin-gfm", "src"), path.join(DEST_DIR, "src", "public", "app-dist", "turndown-plugin-gfm"));

    console.log("Copying complete!")

} catch(err) {
    console.error("Error during copy:", err.message)
    process.exit(1)
}

