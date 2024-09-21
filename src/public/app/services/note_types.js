import server from "./server.js";
import froca from "./froca.js";
import { t } from "./i18n.js";

async function getNoteTypeItems(command) {
    const items = [
        { title: t("note_types.text"), command: command, type: "text", uiIcon: "bx bx-note" },
        { title: t("note_types.code"), command: command, type: "code", uiIcon: "bx bx-code" },
        { title: t("note_types.saved-search"), command: command, type: "search", uiIcon: "bx bx-file-find" },
        { title: t("note_types.relation-map"), command: command, type: "relationMap", uiIcon: "bx bxs-network-chart" },
        { title: t("note_types.note-map"), command: command, type: "noteMap", uiIcon: "bx bxs-network-chart" },
        { title: t("note_types.render-note"), command: command, type: "render", uiIcon: "bx bx-extension" },
        { title: t("note_types.book"), command: command, type: "book", uiIcon: "bx bx-book" },
        { title: t("note_types.mermaid-diagram"), command: command, type: "mermaid", uiIcon: "bx bx-selection" },
        { title: t("note_types.canvas"), command: command, type: "canvas", uiIcon: "bx bx-pen" },
        { title: t("note_types.web-view"), command: command, type: "webView", uiIcon: "bx bx-globe-alt" },
        { title: t("note_types.mind-map"), command, type: "mindMap", uiIcon: "bx bx-sitemap" }
    ];

    const templateNoteIds = await server.get("search-templates");
    const templateNotes = await froca.getNotes(templateNoteIds);

    if (templateNotes.length > 0) {
        items.push({ title: "----" });

        for (const templateNote of templateNotes) {
            items.push({
                title: templateNote.title,
                uiIcon: templateNote.getIcon(),
                command: command,
                type: templateNote.type,
                templateNoteId: templateNote.noteId
            });
        }
    }

    return items;
}

export default {
    getNoteTypeItems
}
