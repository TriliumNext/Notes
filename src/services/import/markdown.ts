"use strict";

import { parse, Renderer, type Tokens } from "marked";

const renderer = new Renderer({ async: false });
renderer.code = ({text, lang, escaped}: Tokens.Code) => {
    if (!text) {
        return "";
    }

    const ckEditorLanguage = getNormalizedMimeFromMarkdownLanguage(lang);
    return `<pre><code class="language-${ckEditorLanguage}">${text}</code></pre>`;
};

import htmlSanitizer from "../html_sanitizer.js";
import importUtils from "./utils.js";
import { getMimeTypeFromHighlightJs, MIME_TYPE_AUTO, normalizeMimeTypeForCKEditor } from "./mime_type_definitions.js";

function renderToHtml(content: string, title: string) {
    const html = parse(content, {
        async: false,
        renderer: renderer
    }) as string;
    const h1Handled = importUtils.handleH1(html, title); // h1 handling needs to come before sanitization
    return htmlSanitizer.sanitize(h1Handled);
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
