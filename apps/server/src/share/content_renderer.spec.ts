import { describe, it, expect } from "vitest";
import { renderCode, type Result } from "./content_renderer.js";

describe("content_renderer", () => {
    describe("renderCode", () => {
        it("identifies empty content", () => {
            const emptyResult: Result = {
                header: "",
                content: "   "
            };
            renderCode(emptyResult);
            expect(emptyResult.isEmpty).toBeTruthy();
        });

        it("identifies unsupported content type", () => {
            const emptyResult: Result = {
                header: "",
                content: Buffer.from("Hello world")
            };
            renderCode(emptyResult);
            expect(emptyResult.isEmpty).toBeTruthy();
        });

        it("wraps code in <pre>", () => {
            const result: Result = {
                header: "",
                content: "\tHello\nworld"
            };
            renderCode(result);
            expect(result.isEmpty).toBeFalsy();
            expect(result.content).toBe("<pre>\tHello\nworld</pre>");
        });
    });
});
