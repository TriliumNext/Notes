import cls from "./src/services/cls.js";
import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";

export function initializeDatabase(skipDemoDb: boolean) {
    return new Promise<void>(async (resolve) => {
        const sqlInit = (await import("./src/services/sql_init.js")).default;
        cls.init(async () => {
            if (!sqlInit.isDbInitialized()) {
                await sqlInit.createInitialDatabase(skipDemoDb);
            }
            resolve();
        });
    });
}

export async function startElectron() {
    await import("./electron-main.js");
}

export async function extractZip(zipFilePath: string, outputPath: string, ignoredFiles?: Set<string>) {
    const deferred = (await import("./src/services/utils.js")).deferred;

    const promise = deferred<void>()
    setTimeout(async () => {
        // Then extract the zip.
        const { readZipFile, readContent } = (await import("./src/services/import/zip.js"));
        await readZipFile(await fs.readFile(zipFilePath), async (zip, entry) => {
            // We ignore directories since they can appear out of order anyway.
            if (!entry.fileName.endsWith("/") && !ignoredFiles?.has(entry.fileName)) {
                const destPath = path.join(outputPath, entry.fileName);
                const fileContent = await readContent(zip, entry);

                await fsExtra.mkdirs(path.dirname(destPath));
                await fs.writeFile(destPath, fileContent);
            }

            zip.readEntry();
        });
        promise.resolve();
    }, 1000);
    await promise;
}
