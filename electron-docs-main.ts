import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import type NoteMeta from "./src/services/meta/note_meta.js";
import type { NoteMetaFile } from "./src/services/meta/note_meta.js";
import { initializeTranslations } from "./src/services/i18n.js";
import archiver, { type Archiver } from "archiver";
import type { WriteStream } from "fs";
import debounce from "./src/public/app/services/debounce.js";
import { extractZip, importData, initializeDatabase, startElectron } from "./electron-utils.js";

const NOTE_ID_USER_GUIDE = "pOsGYCXsbNQG";
const markdownPath = path.join("docs", "User Guide");
const htmlPath = path.join("src", "public", "app", "doc_notes", "en", "User Guide");

async function main() {
    await initializeTranslations();
    const zipBuffer = await createImportZip();
    await initializeDatabase();
    await importData(zipBuffer, NOTE_ID_USER_GUIDE, "User Guide", "The sub-children of this note are automatically synced.");
    await startElectron();
    await registerHandlers();
}

async function createImportZip() {
    const inputFile = "input.zip";
    const archive = archiver("zip", {
        zlib: { level: 0 }
    });

    archive.directory(markdownPath, "/");

    const outputStream = fsExtra.createWriteStream(inputFile);
    archive.pipe(outputStream);
    await waitForEnd(archive, outputStream);

    try {
        return await fsExtra.readFile(inputFile);
    } finally {
        await fsExtra.rm(inputFile);
    }
}

function waitForEnd(archive: Archiver, stream: WriteStream) {
    return new Promise<void>(async (res, rej) => {
        stream.on("finish", () => res());
        await archive.finalize();
    });

}

async function exportData(format: "html" | "markdown", outputPath: string) {
    const zipFilePath = "output.zip";

    try {
        await fsExtra.remove(outputPath);
        await fsExtra.mkdir(outputPath);

        // First export as zip.
        const { exportToZipFile } = (await import("./src/services/export/zip.js")).default;
        await exportToZipFile(NOTE_ID_USER_GUIDE, format, zipFilePath);
        await extractZip(zipFilePath, outputPath);
    } finally {
        if (await fsExtra.exists(zipFilePath)) {
            await fsExtra.rm(zipFilePath);
        }
    }

    await cleanUpMeta(outputPath);
}

async function cleanUpMeta(outputPath: string) {
    const metaPath = path.join(outputPath, "!!!meta.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8")) as NoteMetaFile;
    for (const file of meta.files) {
        file.notePosition = 1;
        traverse(file);
    }

    function traverse(el: NoteMeta) {
        for (const child of el.children || []) {
            traverse(child);
        }

        el.isExpanded = false;
    }

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 4));
}

async function registerHandlers() {
    const events = (await import("./src/services/events.js")).default;
    const eraseService = (await import("./src/services/erase.js")).default;
    const debouncer = debounce(async () => {
        console.log("Exporting data");
        eraseService.eraseUnusedAttachmentsNow();
        await exportData("markdown", markdownPath);
        await exportData("html", htmlPath);
    }, 10_000);;
    events.subscribe(events.ENTITY_CHANGED, async (e) => {
        if (e.entityName === "options") {
            return;
        }

        console.log("Got entity changed ", e);
        debouncer();
    });
}

await main();
