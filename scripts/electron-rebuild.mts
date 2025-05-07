/**
 * @module
 *
 * This script is used internally by the `rebuild-deps` target of the `desktop`. Normally we could use
 * `electron-rebuild` CLI directly, but it would rebuild the monorepo-level dependencies and breaks
 * the server build (and it doesn't expose a CLI option to override this).
 */

import path, { join } from "path";
import { rebuild } from "@electron/rebuild"
import { readFileSync } from "fs";

function getElectronVersion(distDir: string) {
    if (process.argv[3]) {
        return process.argv[3];
    }

    const packageJsonPath = join(distDir, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    const electronVersion = packageJson.devDependencies.electron || packageJson.dependencies.electron;

    return electronVersion;
}

function main() {
    const distDir = path.resolve(process.argv[2]);
    if (!distDir) {
        console.error("Missing root dir as argument.");
        process.exit(1);
    }

    const electronVersion = getElectronVersion(distDir);
    console.log(`Rebuilding ${distDir} with version ${electronVersion}...`);

    rebuild({
        // We force the project root path to avoid electron-rebuild from rebuilding the monorepo-level dependency and breaking the server.
        projectRootPath: distDir,
        buildPath: distDir,
        force: true,
        electronVersion,
    });
}

main();
