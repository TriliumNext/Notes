import { describe, it, expect } from "vitest";
import { trimIndentation } from "../../../spec/support/utils.js";
import markdownService from "./markdown.js";

describe("markdown", () => {
    it("rewrites language of known language tags", () => {
        const conversionTable = {
            "nginx": "language-text-x-nginx-conf",
            "diff": "language-text-x-diff",
            "javascript": "language-application-javascript-env-backend",
            "css": "language-text-css",
            "mips": "language-text-x-asm-mips"
        };

        for (const [ input, output ] of Object.entries(conversionTable)) {
            const result = markdownService.renderToHtml(trimIndentation`\
                \`\`\`${input}
                Hi
                \`\`\`
            `, "title");
            expect(result).toBe(trimIndentation`\
                <pre><code class="${output}">Hi</code></pre>`);
        }
    });

    it("rewrites language of unknown language tags", () => {
        const result = markdownService.renderToHtml(trimIndentation`\
            \`\`\`unknownlanguage
            Hi
            \`\`\`
        `, "title");
        expect(result).toBe(trimIndentation`\
            <pre><code class="language-text-x-trilium-auto">Hi</code></pre>`);
    });

    it("converts h1 heading", () => {
        const result = markdownService.renderToHtml(trimIndentation`\
            # Hello
            ## world
            # another one
            Hello, world
        `, "title");
        expect(result).toBe(`<h2>Hello</h2><h2>world</h2><h2>another one</h2><p>Hello, world</p>`);
    });

    it("parses duplicate title with escape correctly", () => {
        const result = markdownService.renderToHtml(trimIndentation`\
            # What's new
            Hi there
        `, "What's new")
        expect(result).toBe(`<p>Hi there</p>`);
    });

    it("trims unnecessary whitespace", () => {
        const input = `\
## Heading 1

Title

\`\`\`
code block 1
second line 2
\`\`\`

* Hello
* world

1. Hello
2. World
`;
        const expected = `\
<h2>Heading 1</h2><p>Title</p><pre><code class="language-text-x-trilium-auto">code block 1
second line 2</code></pre><ul><li>Hello</li><li>world</li></ul><ol><li>Hello</li><li>World</li></ol>`;
        expect(markdownService.renderToHtml(input, "Troubleshooting")).toBe(expected);
    });

    it("imports admonitions properly", () => {
        const space = " ";  // editor config trimming space.
        const input = trimIndentation`\
            Before

            > [!NOTE]
            > This is a note.

            > [!TIP]
            > This is a tip.

            > [!IMPORTANT]
            > This is a very important information.

            > [!CAUTION]
            > This is a caution.

            > [!WARNING]
            > ## Title goes here
            >${space}
            > This is a warning.

            After`;
        const expected = `<p>Before</p><aside class="admonition note"><p>This is a note.</p></aside><aside class="admonition tip"><p>This is a tip.</p></aside><aside class="admonition important"><p>This is a very important information.</p></aside><aside class="admonition caution"><p>This is a caution.</p></aside><aside class="admonition warning"><h2>Title goes here</h2><p>This is a warning.</p></aside><p>After</p>`;
        expect(markdownService.renderToHtml(input, "Title")).toStrictEqual(expected);
    });

    it("imports images with same outcome as if inserted from CKEditor", () => {
        const input = "![](api/attachments/YbkR3wt2zMcA/image/image)";
        const expected = `<p><img src="api/attachments/YbkR3wt2zMcA/image/image"></p>`;
        expect(markdownService.renderToHtml(input, "Title")).toStrictEqual(expected);
    });

    it("maintains code blocks with XML/HTML", () => {
        const input = trimIndentation`\
            Before
            \`\`\`
            <application
                ...
                android:testOnly="false">
                ...
            </application>
            \`\`\`
            After`;
        const expected = trimIndentation`\
            <p>Before</p><pre><code class="language-text-x-trilium-auto">&lt;application
                ...
                android:testOnly="false"&gt;
                ...
            &lt;/application&gt;</code></pre><p>After</p>`;
        expect(markdownService.renderToHtml(input, "Title")).toStrictEqual(expected);
    });

});
