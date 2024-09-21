"use strict";

import TurndownService from "turndown";
import turndownPluginGfm from "joplin-turndown-plugin-gfm";

let instance: TurndownService | null = null;

function toMarkdown(content: string) {
    if (instance === null) {
        instance = new TurndownService({ codeBlockStyle: 'fenced' });
        instance.use(turndownPluginGfm.gfm);
    }

    return instance.turndown(content);
}

export default {
    toMarkdown
};
