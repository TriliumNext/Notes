import { describe, expect, it } from "vitest";
import { getSizeFromSvg } from "./utils.js";

describe("getSizeFromSvg", () => {
    it("parses width & height attribute", () => {
        const svg = `<svg aria-roledescription="sequence" role="graphics-document document" viewBox="-50 -10 714 574" height="574" xmlns="http://www.w3.org/2000/svg" width="714" id="mermaid-graph-2"></svg>`;
        const result = getSizeFromSvg(svg);
        expect(result).toMatchObject({
            width: 714,
            height: 574,
        });
    });

    it("parses viewbox", () => {
        const svg = `<svg aria-roledescription="er" role="graphics-document document" viewBox="0 0 872.2750244140625 655" style="max-width: 872.2750244140625px;" class="erDiagram" xmlns="http://www.w3.org/2000/svg" width="100%" id="mermaid-graph-2">`;
        const result = getSizeFromSvg(svg);
        expect(result).toMatchObject({
            width: 872.2750244140625,
            height: 655
        });
    });
});
