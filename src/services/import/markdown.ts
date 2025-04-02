"use strict";

import { parse, Renderer, type Tokens } from "marked";

/**
 * Keep renderer code up to date with https://github.com/markedjs/marked/blob/master/src/Renderer.ts.
 */
class CustomMarkdownRenderer extends Renderer {

    heading(data: Tokens.Heading): string {
        return super.heading(data).trimEnd();
    }

    paragraph(data: Tokens.Paragraph): string {
        return super.paragraph(data).trimEnd();
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
        return super.list(token)
            .replace("\n", "")  // we replace the first one only.
            .trimEnd();
    }

    listitem(item: Tokens.ListItem): string {
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
    let html = parse(content, {
        async: false,
        renderer: renderer
    }) as string;

    // h1 handling needs to come before sanitization
    html = importUtils.handleH1(html, title);
    // html = htmlSanitizer.sanitize(html);

    // Remove slash for self-closing tags to match CKEditor's approach.
    html = html.replace(/<(\w+)([^>]*)\s+\/>/g, "<$1$2>");

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
