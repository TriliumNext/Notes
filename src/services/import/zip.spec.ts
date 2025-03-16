import { beforeAll, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import zip from "./zip.js";
import becca from "../../becca/becca.js";
import BNote from "../../becca/entities/bnote.js";
import TaskContext from "../task_context.js";
import cls from "../cls.js";
import sql_init from "../sql_init.js";
import { initializeTranslations } from "../i18n.js";
const scriptDir = dirname(fileURLToPath(import.meta.url));

async function testImport(fileName: string) {
    const mdxSample = fs.readFileSync(path.join(scriptDir, "samples", fileName));
    const taskContext = TaskContext.getInstance("import-mdx", "import", {
        textImportedAsText: true
    });

    return new Promise<{ importedNote: BNote; rootNote: BNote }>((resolve, reject) => {
        cls.init(async () => {
            const rootNote = becca.getNote("root");
            if (!rootNote) {
                expect(rootNote).toBeTruthy();
                return;
            }

            const importedNote = await zip.importZip(taskContext, mdxSample, rootNote as BNote);
            resolve({
                importedNote,
                rootNote
            });
        });
    });
}

describe("processNoteContent", () => {
    beforeAll(async () => {
        // Prevent download of images.
        vi.mock("../image.js", () => {
            return {
                default: { saveImageToAttachment: () => {} }
            };
        });

        initializeTranslations();
        sql_init.initializeDb();
        await sql_init.dbReady;
    });

    it("treats single MDX as Markdown in ZIP as text note", async () => {
        const { importedNote } = await testImport("mdx.zip");
        expect(importedNote.mime).toBe("text/mdx");
        expect(importedNote.type).toBe("text");
        expect(importedNote.title).toBe("Text Note");
    });

    it("can import email from Microsoft Outlook with UTF-16 with BOM", async () => {
        const { rootNote, importedNote } = await testImport("IREN.Reports.Q2.FY25.Results_files.zip");
        const htmlNote = rootNote.children.find((ch) => ch.title === "IREN Reports Q2 FY25 Results");
        expect(htmlNote?.getContent().toString().substring(0, 4)).toEqual("<div");
    });
});
