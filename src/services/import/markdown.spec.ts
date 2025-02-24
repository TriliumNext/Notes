import { describe, it, expect } from "vitest";
import { trimIndentation } from "../../../spec/support/utils.js";
import markdownService from "./markdown.js";

describe("markdown", () => {
    it("converts h1 heading", () => {
        const result = markdownService.renderToHtml(trimIndentation`\
            # Hello
            ## world
            # another one
            Hello, world
        `, "title");
        expect(result).toBe(trimIndentation`\
            <h2>Hello</h2>
            <h2>world</h2>
            <h2>another one</h2>
            <p>Hello, world</p>
        `);
    });

    it("rewrites language of known language tags", () => {
        const result = markdownService.renderToHtml(trimIndentation`\
            \`\`\`javascript
            Hi
            \`\`\`
            \`\`\`css
            there
            \`\`\`
        `, "title");
        expect(result).toBe(trimIndentation`\
            <pre><code class="language-application-javascript-env-backend">Hi</code></pre><pre><code class="language-text-css">there</code></pre>`);
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
});
