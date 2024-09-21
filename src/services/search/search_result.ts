"use strict";

import beccaService from "../../becca/becca_service.js";
import becca from "../../becca/becca.js";

class SearchResult {
    notePathArray: string[];
    score: number;
    notePathTitle: string;
    highlightedNotePathTitle?: string;

    constructor(notePathArray: string[]) {
        this.notePathArray = notePathArray;
        this.notePathTitle = beccaService.getNoteTitleForPath(notePathArray);
        this.score = 0;
    }

    get notePath() {
        return this.notePathArray.join('/');
    }

    get noteId() {
        return this.notePathArray[this.notePathArray.length - 1];
    }

    computeScore(fulltextQuery: string, tokens: string[]) {
        this.score = 0;

        const note = becca.notes[this.noteId];

        if (note.noteId.toLowerCase() === fulltextQuery) {
            this.score += 100;
        }

        if (note.title.toLowerCase() === fulltextQuery) {
            this.score += 100; // high reward for exact match #3470
        }

        // notes with matches on its own note title as opposed to ancestors or descendants
        this.addScoreForStrings(tokens, note.title, 1.5);

        // matches in attributes don't get extra points and thus are implicitly valued less than note path matches

        this.addScoreForStrings(tokens, this.notePathTitle, 1);

        if (note.isInHiddenSubtree()) {
            this.score = this.score / 2;
        }
    }

    addScoreForStrings(tokens: string[], str: string, factor: number) {
        const chunks = str.toLowerCase().split(" ");

        this.score = 0;

        for (const chunk of chunks) {
            for (const token of tokens) {
                if (chunk === token) {
                    this.score += 4 * token.length * factor;
                } else if (chunk.startsWith(token)) {
                    this.score += 2 * token.length * factor;
                } else if (chunk.includes(token)) {
                    this.score += token.length * factor;
                }
            }
        }
    }
}

export default SearchResult;
