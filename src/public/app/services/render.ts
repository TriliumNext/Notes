import server from "./server.js";
import bundleService, { type Bundle } from "./bundle.js";
import type FNote from "../entities/fnote.js";

async function render(note: FNote, $el: JQuery<HTMLElement>) {
    const relations = note.getRelations("renderNote");
    const renderNoteIds = relations.map((rel) => rel.value).filter((noteId) => noteId);

    $el.empty().toggle(renderNoteIds.length > 0);

    for (const renderNoteId of renderNoteIds) {
        const bundle = await server.post<Bundle>(`script/bundle/${renderNoteId}`);

        const $scriptContainer = $("<div>");
        $el.append($scriptContainer);

        $scriptContainer.append(bundle.html);

        // async so that scripts cannot block trilium execution
        bundleService.executeBundle(bundle, note, $scriptContainer);
    }

    return renderNoteIds.length > 0;
}

export default {
    render
};
