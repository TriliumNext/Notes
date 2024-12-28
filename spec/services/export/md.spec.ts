import markdownExportService from "../../../src/services/export/md.js";
import { trimIndentation } from "../../support/utils.js";

describe("Markdown export", () => {
    it("trims language tag for code blocks", () => {
        const html = trimIndentation`\
            <p>A diff:</p>
            <pre><code class="language-text-x-diff">Hello
            -world
            +worldy
            </code></pre>`;
        const expected = trimIndentation`\
            A diff:

            \`\`\`diff
            Hello
            -world
            +worldy

            \`\`\``;

        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });

    it("removes auto tag for code blocks", () => {
        const html = trimIndentation`\
            <pre><code class="language-text-x-trilium-auto">Hello
            -world
            +worldy
            </code></pre>`;
        const expected = trimIndentation`\
            \`\`\`
            Hello
            -world
            +worldy

            \`\`\``;

        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });

    it("supports code block with no language tag", () => {
        const html = trimIndentation`\
            <pre><code>Hello</code></pre>`;
        const expected = trimIndentation`\
            \`\`\`
            Hello
            \`\`\``;

        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });
});
