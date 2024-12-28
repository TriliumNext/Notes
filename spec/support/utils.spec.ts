import { trimIndentation } from "./utils.js";

describe("Utils", () => {
    it("trims indentation", () => {
        expect(trimIndentation`\
            Hello
                world
            123`
        ).toBe(`\
Hello
    world
123`);
    });
});
