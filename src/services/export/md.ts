"use strict";

import TurndownService from "turndown";
import turndownPluginGfm from "joplin-turndown-plugin-gfm";

let instance: TurndownService | null = null;

const fencedCodeBlockFilter: TurndownService.Rule = {
  filter: function (node, options) {
    return (
    options.codeBlockStyle === 'fenced' &&
    node.nodeName === 'PRE' &&
    node.firstChild !== null &&
    node.firstChild.nodeName === 'CODE'
    )
  },

  replacement: function (content, node, options) {
    if (!node.firstChild || !("getAttribute" in node.firstChild) || typeof node.firstChild.getAttribute !== "function") {
    return content;
    }

    const className = node.firstChild.getAttribute('class') || ''
    const language = rewriteLanguageTag((className.match(/language-(\S+)/) || [null, ''])[1]);

    return (
    '\n\n' + options.fence + language + '\n' +
    node.firstChild.textContent +
    '\n' + options.fence + '\n\n'
    )
  }
};

function toMarkdown(content: string) {
    if (instance === null) {
        instance = new TurndownService({ codeBlockStyle: 'fenced' });
        // Filter is heavily based on: https://github.com/mixmark-io/turndown/issues/274#issuecomment-458730974
        instance.addRule('fencedCodeBlock', fencedCodeBlockFilter);
        instance.use(turndownPluginGfm.gfm);
    }

    return instance.turndown(content);
}

function rewriteLanguageTag(source: string) {
    if (!source) {
    return source;
    }

    if (source === "text-x-trilium-auto") {
        return "";
    }

    return source
        .split("-")
        .at(-1);
}

export default {
    toMarkdown
};
