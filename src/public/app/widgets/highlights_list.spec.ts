import { describe, expect, it } from "vitest";
import HighlightsListWidget from "./highlights_list.js";

describe("getHighlightList", () => {
    let widget = new HighlightsListWidget();

    it("supports old italics", async () => {
        const highlights = await widget.getHighlightList("This is <i>italic</i> text", [ "italic" ]);
        expect(highlights.$highlightsList.html()).toBe("<li><i>italic</i></li>");
        expect(highlights.findSubStr).toContain("i:not(section.include-note i)");
    });

    it("supports new italics", async () => {
        const highlights = await widget.getHighlightList("This is <em>italic</em> text", [ "italic" ]);
        expect(highlights.$highlightsList.html()).toBe("<li><em>italic</em></li>");
        expect(highlights.findSubStr).toContain("em:not(section.include-note em)");
    });
})
