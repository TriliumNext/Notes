"use strict";

import { parse, Renderer, type Tokens } from "marked";

/**
 * Keep renderer code up to date with https://github.com/markedjs/marked/blob/master/src/Renderer.ts.
 */
class CustomMarkdownRenderer extends Renderer {

    heading(data: Tokens.Heading): string {
        // Treat h1 as raw text.
        if (data.depth === 1) {
            return `<h1>${data.text}</h1>`;
        }

        return super.heading(data).trimEnd();
    }

    paragraph(data: Tokens.Paragraph): string {
        let text = super.paragraph(data).trimEnd();

        if (text.includes("$")) {
            // Display math
            text = text.replaceAll(/(?<!\\)\$\$(.+)\$\$/g,
                `<span class="math-tex">\\\[$1\\\]</span>`);

            // Inline math
            text = text.replaceAll(/(?<!\\)\$(.+)\$/g,
                `<span class="math-tex">\\\($1\\\)</span>`);
        }

        return text;
    }

    code({ text, lang }: Tokens.Code): string {
        if (!text) {
            return "";
        }

        // Escape the HTML.
        text = utils.escapeHtml(text);

        // Unescape &quot
        text = text.replace(/&quot;/g, '"');

        const ckEditorLanguage = getNormalizedMimeFromMarkdownLanguage(lang);
        return `<pre><code class="language-${ckEditorLanguage}">${text}</code></pre>`;
    }

    list(token: Tokens.List): string {
        let result = super.list(token)
            .replace("\n", "")  // we replace the first one only.
            .trimEnd();

        // Handle todo-list in the CKEditor format.
        if (token.items.some(item => item.task)) {
            result = result.replace(/^<ul>/, "<ul class=\"todo-list\">");
        }

        return result;
    }

    checkbox({ checked }: Tokens.Checkbox): string {
        return '<input type="checkbox"'
            + (checked ? 'checked="checked" ' : '')
            + 'disabled="disabled">';
    }

    listitem(item: Tokens.ListItem): string {
        // Handle todo-list in the CKEditor format.
        if (item.task) {
            let itemBody = '';
            const checkbox = this.checkbox({ checked: !!item.checked });
            if (item.loose) {
                if (item.tokens[0]?.type === 'paragraph') {
                    item.tokens[0].text = checkbox + item.tokens[0].text;
                    if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
                        item.tokens[0].tokens[0].text = checkbox + escape(item.tokens[0].tokens[0].text);
                        item.tokens[0].tokens[0].escaped = true;
                    }
                } else {
                    item.tokens.unshift({
                        type: 'text',
                        raw: checkbox,
                        text: checkbox,
                        escaped: true,
                    });
                }
            } else {
                itemBody += checkbox;
            }

            itemBody += `<span class="todo-list__label__description">${this.parser.parse(item.tokens, !!item.loose)}</span>`;
            return `<li><label class="todo-list__label">${itemBody}</label></li>`;
        }

        return super.listitem(item).trimEnd();
    }

    image(token: Tokens.Image): string {
        return super.image(token)
            .replace(` alt=""`, "");
    }

    blockquote({ tokens }: Tokens.Blockquote): string {
        const body = renderer.parser.parse(tokens);

        const admonitionMatch = /^<p>\[\!([A-Z]+)\]/.exec(body);
        if (Array.isArray(admonitionMatch) && admonitionMatch.length === 2) {
            const type = admonitionMatch[1].toLowerCase();

            if (ADMONITION_TYPE_MAPPINGS[type]) {
                const bodyWithoutHeader = body
                    .replace(/^<p>\[\!([A-Z]+)\]\s*/, "<p>")
                    .replace(/^<p><\/p>/, ""); // Having a heading will generate an empty paragraph that we need to remove.

                return `<aside class="admonition ${type}">${bodyWithoutHeader.trim()}</aside>`;
            }
        }

        return `<blockquote>${body}</blockquote>`;
    }

}

const renderer = new CustomMarkdownRenderer({ async: false });

import htmlSanitizer from "../html_sanitizer.js";
import importUtils from "./utils.js";
import { getMimeTypeFromHighlightJs, MIME_TYPE_AUTO, normalizeMimeTypeForCKEditor } from "./mime_type_definitions.js";
import { ADMONITION_TYPE_MAPPINGS } from "../export/markdown.js";
import utils from "../utils.js";

function renderToHtml(content: string, title: string) {
    // Double-escape slashes in math expression because they are otherwise consumed by the parser somewhere.
    content = content.replaceAll("\\$", "\\\\$");

    let html = parse(content, {
        async: false,
        renderer: renderer
    }) as string;

    // h1 handling needs to come before sanitization
    html = importUtils.handleH1(html, title);
    html = htmlSanitizer.sanitize(html);

    // Add a trailing semicolon to CSS styles.
    html = html.replaceAll(/(<(img|figure|col).*?style=".*?)"/g, "$1;\"");

    // Remove slash for self-closing tags to match CKEditor's approach.
    html = html.replace(/<(\w+)([^>]*)\s+\/>/g, "<$1$2>");

    // Normalize non-breaking spaces to entity.
    html = html.replaceAll("\u00a0", "&nbsp;");

    return html;
}

function getNormalizedMimeFromMarkdownLanguage(language: string | undefined) {
    if (language) {
        const highlightJsName = getMimeTypeFromHighlightJs(language);
        if (highlightJsName) {
            return normalizeMimeTypeForCKEditor(highlightJsName.mime);
        }
    }

    return MIME_TYPE_AUTO;
}

export default {
    renderToHtml
};
