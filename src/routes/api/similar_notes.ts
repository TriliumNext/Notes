"use strict";

import { Request } from "express";

import similarityService from "../../becca/similarity.js";
import becca from "../../becca/becca.js";

async function getSimilarNotes(req: Request) {
    const noteId = req.params.noteId;

    const note = becca.getNoteOrThrow(noteId);

    return await similarityService.findSimilarNotes(noteId);
}

export default {
    getSimilarNotes
};
