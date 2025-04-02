import { describe, expect, it, vi } from "vitest";
import { trimIndentation } from "../../../../../../spec/support/utils.js";
import { validateMermaid } from "./mermaid.js";

describe("Mermaid linter", () => {

    (global as any).CodeMirror = {
        Pos(line: number, col: number) {
            return { line, col };
        }
    };

    it("reports correctly bad diagram type", async () => {
        const input = trimIndentation`\
            stateDiagram-v23
            [*] -> Still
        `;

        const result = await validateMermaid(input);
        expect(result).toMatchObject([{
            message: "Expecting 'SPACE', 'NL', 'SD', got 'ID'",
            from: { line: 0, col: 0 },
            to: { line: 0, col: 1 }
        }]);
    });

    it("reports correctly basic arrow missing in diagram", async () => {
        const input = trimIndentation`\
            xychart-beta horizontal
            title "Percentage usge"
            x-axis [data, sys, usr, var]
            y-axis 0--->100
            bar [20, 70, 0, 0]
        `;

        const result = await validateMermaid(input);
        expect(result).toMatchObject([{
            message: "Expecting 'ARROW_DELIMITER', got 'MINUS'",
            from: { line: 3, col: 8 },
            to: { line: 3, col: 9 }
        }]);
    });
});
