import server from "./server.js";
import froca from "./froca.js";

async function searchForNoteIds(searchString, page = 1, pageSize = 20) {
    const response = await server.get(
        `search/${encodeURIComponent(searchString)}?page=${page}&pageSize=${pageSize}`
    );
    return response;
}

async function searchForNotes(searchString, page = 1, pageSize = 20) {
    const {results: noteIds, hasMore, page: currentPage} = await searchForNoteIds(searchString, page, pageSize);
    const notes = await froca.getNotes(noteIds);
    
    return {
        notes,
        hasMore,
        page: currentPage
    };
}

export default {
    searchForNoteIds,
    searchForNotes
}
