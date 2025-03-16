"use strict";

import TurndownService from "turndown";
import turndownPluginGfm from "@joplin/turndown-plugin-gfm";

let instance: TurndownService | null = null;

// TODO: Move this to a dedicated file someday.
export const ADMONITION_TYPE_MAPPINGS: Record<string, string> = {
    note: "NOTE",
    tip: "TIP",
    important: "IMPORTANT",
    caution: "CAUTION",
    warning: "WARNING"
};

export const DEFAULT_ADMONITION_TYPE = ADMONITION_TYPE_MAPPINGS.note;

const fencedCodeBlockFilter: TurndownService.Rule = {
    filter: function (node, options) {
        return options.codeBlockStyle === "fenced" && node.nodeName === "PRE" && node.firstChild !== null && node.firstChild.nodeName === "CODE";
    },

    replacement: function (content, node, options) {
        if (!node.firstChild || !("getAttribute" in node.firstChild) || typeof node.firstChild.getAttribute !== "function") {
            return content;
        }

        const className = node.firstChild.getAttribute("class") || "";
        const language = rewriteLanguageTag((className.match(/language-(\S+)/) || [null, ""])[1]);

        return "\n\n" + options.fence + language + "\n" + node.firstChild.textContent + "\n" + options.fence + "\n\n";
    }
};

function toMarkdown(content: string) {
    if (instance === null) {
        instance = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced"
        });
        // Filter is heavily based on: https://github.com/mixmark-io/turndown/issues/274#issuecomment-458730974
        instance.addRule("fencedCodeBlock", fencedCodeBlockFilter);
        instance.addRule("img", buildImageFilter());
        instance.addRule("admonition", buildAdmonitionFilter());
        instance.use(turndownPluginGfm.gfm);
        instance.keep([ "kbd" ]);
    }

    return instance.turndown(content);
}

function rewriteLanguageTag(source: string) {
    if (!source) {
        return source;
    }

    switch (source) {
        case "text-x-trilium-auto":
            return "";
        case "application-javascript-env-frontend":
        case "application-javascript-env-backend":
            return "javascript";
        case "text-x-nginx-conf":
            return "nginx";
        default:
            return source.split("-").at(-1);
    }
}

// TODO: Remove once upstream delivers a fix for https://github.com/mixmark-io/turndown/issues/467.
function buildImageFilter() {
    const ESCAPE_PATTERNS = {
        before: /([\\*`[\]_]|(?:^[-+>])|(?:^~~~)|(?:^#{1-6}))/g,
        after: /((?:^\d+(?=\.)))/
    }

    const escapePattern = new RegExp('(?:' + ESCAPE_PATTERNS.before.source + '|' + ESCAPE_PATTERNS.after.source + ')', 'g');

    function escapeMarkdown (content: string) {
        return content.replace(escapePattern, function (match, before, after) {
            return before ? '\\' + before : after + '\\'
        })
    }

    function escapeLinkDestination(destination: string) {
        return destination
            .replace(/([()])/g, '\\$1')
            .replace(/ /g, "%20");
    }

    function escapeLinkTitle (title: string) {
        return title.replace(/"/g, '\\"')
    }

    function cleanAttribute (attribute: string) {
        return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : ''
    }

    const imageFilter: TurndownService.Rule = {
        filter: "img",
        replacement(content, node) {
            const untypedNode = (node as any);
            const alt = escapeMarkdown(cleanAttribute(untypedNode.getAttribute('alt')))
            const src = escapeLinkDestination(untypedNode.getAttribute('src') || '')
            const title = cleanAttribute(untypedNode.getAttribute('title'))
            const titlePart = title ? ' "' + escapeLinkTitle(title) + '"' : ''

            return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : ''
        }
    };
    return imageFilter;
}

function buildAdmonitionFilter() {
    function parseAdmonitionType(_node: Node) {
        if (!("getAttribute" in _node)) {
            return DEFAULT_ADMONITION_TYPE;
        }

        const node = _node as Element;
        const classList = node.getAttribute("class")?.split(" ") ?? [];

        for (const className of classList) {
            if (className === "admonition") {
                continue;
            }

            const mappedType = ADMONITION_TYPE_MAPPINGS[className];
            if (mappedType) {
                return mappedType;
            }
        }

        return DEFAULT_ADMONITION_TYPE;
    }

    const admonitionFilter: TurndownService.Rule = {
        filter(node, options) {
            return node.nodeName === "ASIDE" && node.classList.contains("admonition");
        },
        replacement(content, node) {
            // Parse the admonition type.
            const admonitionType = parseAdmonitionType(node);

            content = content.replace(/^\n+|\n+$/g, '');
            content = content.replace(/^/gm, '> ');
            content = `> [!${admonitionType}]\n` + content;

            return "\n\n" + content + "\n\n";
        }
    }
    return admonitionFilter;
}

export default {
    toMarkdown
};
