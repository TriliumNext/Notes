import fs from "fs/promises";
import fsExtra from "fs-extra";
import path from "path";
import type NoteMeta from "./src/services/meta/note_meta.js";
import type { NoteMetaFile } from "./src/services/meta/note_meta.js";
import cls from "./src/services/cls.js";
import { initializeTranslations } from "./src/services/i18n.js";
import archiver, { type Archiver } from "archiver";
import type { WriteStream } from "fs";
import debounce from "./src/public/app/services/debounce.js";

const NOTE_ID_USER_GUIDE = "pOsGYCXsbNQG";
const markdownPath = path.join("docs", "User Guide");
const htmlPath = path.join("src", "public", "app", "doc_notes", "en", "User Guide");

async function startElectron() {
    await import("./electron-main.js");
}

async function main() {
    await initializeTranslations();
    const zipBuffer = await createImportZip();
    await initializeDatabase();
    await importData(zipBuffer);
    await startElectron();
    await registerHandlers();
}

async function initializeDatabase() {
    const sqlInit = (await import("./src/services/sql_init.js")).default;

    cls.init(() => {
        if (!sqlInit.isDbInitialized()) {
            sqlInit.createInitialDatabase();
        }
    });
}

function importData(input: Buffer) {
    return new Promise<void>((resolve, reject) => {
        cls.init(async () => {
            const beccaLoader = ((await import("./src/becca/becca_loader.js")).default);
            const notes = ((await import("./src/services/notes.js")).default);
            beccaLoader.load();
            const becca = ((await import("./src/becca/becca.js")).default);
            const utils = ((await import("./src/services/utils.js")).default);
            const eraseService = ((await import("./src/services/erase.js")).default);
            const deleteId = utils.randomString(10);

            const existingNote = becca.getNote(NOTE_ID_USER_GUIDE);
            if (existingNote) {
                existingNote.deleteNote(deleteId);
            }
            eraseService.eraseNotesWithDeleteId(deleteId);

            const { note } = notes.createNewNoteWithTarget("into", "none_root", {
                parentNoteId: "root",
                noteId: NOTE_ID_USER_GUIDE,
                title: "User Guide",
                content: "The sub-children of this note are automatically synced.",
                type: "text"
            });

            const TaskContext = (await import("./src/services/task_context.js")).default;
            const { importZip } = ((await import("./src/services/import/zip.js")).default);
            const context = new TaskContext("no-report");
            await importZip(context, input, note, { preserveIds: true });

            const { runOnDemandChecks } = (await import("./src/services/consistency_checks.js")).default;
            await runOnDemandChecks(true);

            becca.reset();
            beccaLoader.load();

            resolve();
        });
    });

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

    const deferred = (await import("./src/services/utils.js")).deferred;

    try {
        await fsExtra.remove(outputPath);
        await fsExtra.mkdir(outputPath);

        // First export as zip.
        const { exportToZipFile } = (await import("./src/services/export/zip.js")).default;
        await exportToZipFile(NOTE_ID_USER_GUIDE, format, zipFilePath);

        const promise = deferred<void>()
        setTimeout(async () => {
            // Then extract the zip.
            const { readZipFile, readContent } = (await import("./src/services/import/zip.js"));
            await readZipFile(await fs.readFile(zipFilePath), async (zip, entry) => {
                // We ignore directories since they can appear out of order anyway.
                if (!entry.fileName.endsWith("/")) {
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
    } finally {
        if (await fsExtra.exists(zipFilePath)) {
            await fsExtra.rm(zipFilePath);
        }
    }

    await cleanUpMeta();
}

async function cleanUpMeta() {
    const metaPath = path.join(markdownPath, "!!!meta.json");
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8")) as NoteMetaFile;
    for (const file of meta.files) {
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
