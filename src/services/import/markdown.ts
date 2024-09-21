"use strict";

import { parse } from "marked";
import htmlSanitizer from "../html_sanitizer.js";
import importUtils from "./utils.js";

function renderToHtml(content: string, title: string) {
    const html = parse(content, {
        async: false
    }) as string;
    const h1Handled = importUtils.handleH1(html, title); // h1 handling needs to come before sanitization
    return htmlSanitizer.sanitize(h1Handled);
}

export default {
    renderToHtml
};
