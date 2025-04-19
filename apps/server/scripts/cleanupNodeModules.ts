import fs from "fs-extra";
import path from "path";
import type { Dirent } from "fs-extra";
import { execSync } from "node:child_process";

/**
 * Example usage with node >= v22:
 *    node --experimental-strip-types bin/cleanupNodeModules.ts /path/to/build/folder [--skip-prune-dev-deps]
 * Example usage with tsx:
 *    tsx bin/cleanupNodeModules.ts /path/to/build/folder [--skip-prune-dev-deps]
 */
function main() {

    if (process.argv.length > 4 || process.argv.length < 3) {
        console.error("Usage: cleanupNodeModules.ts [path-to-build-folder] [--skip-prune-dev-deps]");
        process.exit(1);
    }

    const basePath = process.argv[2];
    const pruneDevDeps = process.argv[3] !== "--skip-prune-dev-deps";

    if (!fs.existsSync(basePath)) {
        console.error(`Supplied path '${basePath}' does not exist. Aborting.`);
        process.exit(1);
    }

    console.log(`Starting pruning of node_modules ${!pruneDevDeps ? '(skipping npm pruning)' : ''} in '${basePath}'...`);
    cleanupNodeModules(basePath, pruneDevDeps);
    console.log("Successfully pruned node_modules.");
}

function cleanupNodeModules(basePath: string, pruneDevDeps: boolean = true) {

    const nodeModulesDirPath = path.join(basePath, "node_modules");
    const nodeModulesContent = fs.readdirSync(nodeModulesDirPath, { recursive: true, withFileTypes: true });
    //const libDir = fs.readdirSync(path.join(basePath, "./libraries"), { recursive: true, withFileTypes: true });

    /**
     * Delete unnecessary folders
     */
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

    nodeModulesContent
        .filter(el => el.isDirectory() && filterableDirs.has(el.name))
        .forEach(dir => removeDirent(dir));

    /**
     * Delete unnecessary files based on file extension
     * TODO filter out useless (README).md files
     */
    const filterableFileExt = new Set([
        "ts",
        "map"
    ]);

    nodeModulesContent
        // TriliumNextTODO: check if we can improve this naive file ext matching, without introducing any additional dependency
        .filter(el => el.isFile() && filterableFileExt.has(el.name.split(".").at(-1) || ""))
        .forEach(dir => removeDirent(dir));


    /**
     * Delete specific unnecessary folders
     * TODO: check if we want removeSync to throw an error, if path does not exist anymore -> currently it will silently fail
     */
    const extraFoldersDelete = new Set([
        path.join(nodeModulesDirPath, ".bin"),
        path.join(nodeModulesDirPath, "@excalidraw", "excalidraw", "dist", "dev"),
        path.join(nodeModulesDirPath, "boxicons", "svg"),
        path.join(nodeModulesDirPath, "boxicons", "node_modules"),
        path.join(nodeModulesDirPath, "boxicons", "src"),
        path.join(nodeModulesDirPath, "boxicons", "iconjar"),
        path.join(nodeModulesDirPath, "@jimp", "plugin-print", "fonts"),
        path.join(nodeModulesDirPath, "jimp", "dist", "browser") // missing "@" in front of jimp is not a typo here
    ]);

    nodeModulesContent
        .filter(el => el.isDirectory() && extraFoldersDelete.has(path.join(el.parentPath, el.name)))
        .forEach(dir => removeDirent(dir))
}


function removeDirent(el: Dirent) {
    const elementToDelete = path.join(el.parentPath, el.name);
    fs.removeSync(elementToDelete);

    if (process.env.VERBOSE) {
        console.log(`Deleted ${elementToDelete}`);
    }

}

main()