"use strict";

function handleH1(content: string, title: string) {
    content = content.replace(/<h1[^>]*>([^<]*)<\/h1>/gi, (match, text) => {
        if (title.trim() === text.trim()) {
            return ""; // remove whole H1 tag
        } else {
            return `<h2>${text}</h2>`;
        }
    });
    return content;
}

function extractHtmlTitle(content: string): string | null {
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : null;
}

export default {
    handleH1,
    extractHtmlTitle
};
