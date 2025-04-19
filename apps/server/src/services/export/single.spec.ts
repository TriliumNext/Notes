import { describe, expect, it } from "vitest";
import BNote from "../../becca/entities/bnote.js";
import { mapByNoteType } from "./single.js";

describe("Note type mappings", () => {
    it("supports mermaid note", () => {
        const note = new BNote({
            type: "mermaid",
            title: "New note"
        });

        expect(mapByNoteType(note, "", "html")).toMatchObject({
            extension: "mermaid",
            mime: "text/vnd.mermaid"
        });
    });
});
