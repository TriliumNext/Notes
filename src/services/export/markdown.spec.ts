import { describe, it, expect } from "vitest";
import markdownExportService from "./markdown.js";
import { trimIndentation } from "../../../spec/support/utils.js";

describe("Markdown export", () => {

    it("exports correct language tag for known languages", () => {
        const conversionTable = {
            "language-text-x-nginx-conf": "nginx",
            "language-text-x-diff": "diff",
            "language-application-javascript-env-frontend": "javascript",
            "language-application-javascript-env-backend": "javascript",
            "language-text-x-asm-mips": "mips"
        };

        for (const [ input, output ] of Object.entries(conversionTable)) {
            const html = trimIndentation`\
                <p>A diff:</p>
                <pre><code class="${input}">Hello
                -world
                +worldy
                </code></pre>`;
            const expected = trimIndentation`\
                A diff:

                \`\`\`${output}
                Hello
                -world
                +worldy

                \`\`\``;

            expect(markdownExportService.toMarkdown(html)).toBe(expected);
        }
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

    it("rewrites image URL with spaces", () => {
        const html = `<img src="Hello world  .png"/>`;
        const expected = `![](Hello%20world%20%20.png)`;
        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });

    it("supports keyboard shortcuts", () => {
        const html = "<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Delete</kbd>";
        expect(markdownExportService.toMarkdown(html)).toBe(html);
    });

    it("exports admonitions properly", () => {
        const html = trimIndentation`\
            <p>
                Before
            </p>
            <aside class="admonition note">
                <p>
                    This is a note.
                </p>
            </aside>
            <aside class="admonition tip">
                <p>
                    This is a tip.
                </p>
            </aside>
            <aside class="admonition important">
                <p>
                    This is a very important information.
                </p>
                <figure class="table">
                    <table>
                        <tbody>
                            <tr>
                                <td>
                                    1
                                </td>
                                <td>
                                    2
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    3
                                </td>
                                <td>
                                    4
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </figure>
            </aside>
            <aside class="admonition caution">
                <p>
                    This is a caution.
                </p>
            </aside>
            <aside class="admonition warning">
                <h2>
                    Title goes here
                </h2>
                <p>
                    This is a warning.
                </p>
            </aside>
            <p>
                After
            </p>
        `;

        const space = " ";  // editor config trimming space.
        const expected = trimIndentation`\
            Before

            > [!NOTE]
            > This is a note.

            > [!TIP]
            > This is a tip.

            > [!IMPORTANT]
            > This is a very important information.
            >${space}
            > |     |     |
            > | --- | --- |
            > | 1   | 2   |
            > | 3   | 4   |

            > [!CAUTION]
            > This is a caution.

            > [!WARNING]
            > ## Title goes here
            >${space}
            > This is a warning.

            After`;
        expect(markdownExportService.toMarkdown(html)).toBe(expected);
    });

});
