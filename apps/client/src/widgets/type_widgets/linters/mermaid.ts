import mermaid from "mermaid";

interface MermaidParseError extends Error {
    hash: {
        text: string;
        token: string;
        line: number;
        loc: {
            first_line: number;
            first_column: number;
            last_line: number;
            last_column: number;
        };
        expected: string[]
    }
}

export default function registerErrorReporter() {
    CodeMirror.registerHelper("lint", null, validateMermaid);
}

export async function validateMermaid(text: string) {
    if (!text.trim()) {
        return [];
    }

    try {
        await mermaid.parse(text);
    } catch (e: unknown) {
        console.warn("Got validation error", JSON.stringify(e));

        const mermaidError = (e as MermaidParseError);
        const loc = mermaidError.hash.loc;

        let firstCol = loc.first_column + 1;
        let lastCol = loc.last_column + 1;

        if (firstCol === 1 && lastCol === 1) {
            firstCol = 0;
        }

        let messageLines = mermaidError.message.split("\n");
        if (messageLines.length >= 4) {
            messageLines = messageLines.slice(3);
        }

        return [
            {
                message: messageLines.join("\n"),
                severity: "error",
                from: CodeMirror.Pos(loc.first_line - 1, firstCol),
                to: CodeMirror.Pos(loc.last_line - 1, lastCol)
            }
        ];
    }

    return [];
}
