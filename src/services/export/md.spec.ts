import { describe, it, expect } from "vitest";
import markdownExportService from "./md.js";
import { trimIndentation } from "../../../spec/support/utils.js";

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

    it("rewrites frontend script JavaScript code block", () => {
        const html = `<pre><code class="language-application-javascript-env-frontend">Hello</code></pre>`;
        const expected = trimIndentation`\
            \`\`\`javascript
            Hello
            \`\`\``;
        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });

    it("rewrites backend script JavaScript code block", () => {
        const html = `<pre><code class="language-application-javascript-env-backend">Hello</code></pre>`;
        const expected = trimIndentation`\
            \`\`\`javascript
            Hello
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

    it("exports strikethrough text correctly", () => {
        const html = "<s>hello</s>Hello <s>world</s>";
        const expected = "~~hello~~Hello ~~world~~";
        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });

    it("exports headings properly", () => {
        const html = trimIndentation`\
            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <h3>Heading 3</h3>
            <h4>Heading 4</h4>
            <h5>Heading 5</h5>
            <h6>Heading 6</h6>
        `;
        const expected = trimIndentation`\
            # Heading 1

            ## Heading 2

            ### Heading 3

            #### Heading 4

            ##### Heading 5

            ###### Heading 6`;
        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });
});
