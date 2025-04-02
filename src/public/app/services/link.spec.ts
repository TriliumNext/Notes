import { describe, expect, it } from "vitest";
import { parseNavigationStateFromUrl } from "./link.js";

describe("Link", () => {
    it("parses plain searchString", () => {
        const output = parseNavigationStateFromUrl("http://localhost:8080/#?searchString=hello");
        expect(output).toMatchObject({ searchString: "hello" });
    });

    it("parses searchString with hash", () => {
        const output = parseNavigationStateFromUrl("https://github.com/orgs/TriliumNext/discussions/1526#discussioncomment-12656660");
        expect(output).toStrictEqual({});
    });

    it("parses notePath", () => {
        const output = parseNavigationStateFromUrl(`#root/WWaBNf3SSA1b/mQ2tIzLVFKHL`);
        expect(output).toMatchObject({ notePath: "root/WWaBNf3SSA1b/mQ2tIzLVFKHL", noteId: "mQ2tIzLVFKHL" });
    });
});
