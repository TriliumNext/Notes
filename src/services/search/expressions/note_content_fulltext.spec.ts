import { describe, it, expect } from "vitest";
import { processMindmapContent } from "./note_content_fulltext.js";

describe("processMindmapContent", () => {
    it("supports empty JSON", () => {
        expect(processMindmapContent("{}")).toEqual("");
    });

    it("supports blank text / invalid JSON", () => {
        expect(processMindmapContent("")).toEqual("");
        expect(processMindmapContent(`{ "node": " }`)).toEqual("");
    });
});
