"use strict";

import type { Request } from "express";

import similarityService from "../../becca/similarity.js";
import becca from "../../becca/becca.js";

async function getSimilarNotes(req: Request) {
    const noteId = req.params.noteId;

    const _note = becca.getNoteOrThrow(noteId);

    return await similarityService.findSimilarNotes(noteId);
}

export default {
    getSimilarNotes
};
