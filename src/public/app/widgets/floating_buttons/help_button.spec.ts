import { describe, expect, it } from "vitest";
import { byBookType, byNoteType } from "./help_button.js";
import fs from "fs";
import type { NoteMetaFile } from "../../../../services/meta/note_meta.js";
import type NoteMeta from "../../../../services/meta/note_meta.js";

describe("Help button", () => {
    it("All help notes are accessible", () => {
        function getNoteIds(item: NoteMeta | NoteMetaFile): string[] {
            const items = [];

            if ("noteId" in item && item.noteId) {
                items.push(item.noteId);
            }

            const children = "files" in item ? item.files : item.children;
            for (const child of children ?? []) {
                items.push(getNoteIds(child));
            }
            return items.flat();
        }

        const allHelpNotes = [
            ...Object.values(byNoteType),
            ...Object.values(byBookType)
        ].filter((noteId) => noteId) as string[];

        const meta: NoteMetaFile = JSON.parse(fs.readFileSync("src/public/app/doc_notes/en/User Guide/!!!meta.json", "utf-8"));
        const allNoteIds = new Set(getNoteIds(meta));

        for (const helpNote of allHelpNotes) {
            if (!allNoteIds.has(helpNote)) {
                expect.fail(`Help note with ID ${helpNote} does not exist in the in-app help.`);
            }
        }
    });
});
