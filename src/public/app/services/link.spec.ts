import { describe, expect, it } from "vitest";
import { parseNavigationStateFromUrl } from "./link.js";

describe("Link", () => {
    it("parses plain searchString", () => {
        const output = parseNavigationStateFromUrl("http://localhost:8080/#?searchString=hello");
        expect(output).toMatchObject({ searchString: "hello" });
    });
});
