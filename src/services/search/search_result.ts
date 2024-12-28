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
        const normalizedQuery = fulltextQuery.toLowerCase();
        const normalizedTitle = note.title.toLowerCase();

        // Note ID exact match, much higher score
        if (note.noteId.toLowerCase() === fulltextQuery) {
            this.score += 1000;
        }

        // Title matching scores, make sure to always win
        if (normalizedTitle === normalizedQuery) {
            this.score += 2000; // Increased from 1000 to ensure exact matches always win
        }
        else if (normalizedTitle.startsWith(normalizedQuery)) {
            this.score += 500;  // Increased to give more weight to prefix matches
        }
        else if (normalizedTitle.includes(` ${normalizedQuery} `) ||
                normalizedTitle.startsWith(`${normalizedQuery} `) ||
                normalizedTitle.endsWith(` ${normalizedQuery}`)) {
            this.score += 300;  // Increased to better distinguish word matches
        }

        // Add scores for partial matches with adjusted weights
        this.addScoreForStrings(tokens, note.title, 2.0);  // Increased to give more weight to title matches
        this.addScoreForStrings(tokens, this.notePathTitle, 0.3); // Reduced to further de-emphasize path matches

        if (note.isInHiddenSubtree()) {
            this.score = this.score / 3; // Increased penalty for hidden notes
        }
    }

    addScoreForStrings(tokens: string[], str: string, factor: number) {
        const chunks = str.toLowerCase().split(" ");

        let tokenScore = 0;
        for (const chunk of chunks) {
            for (const token of tokens) {
                if (chunk === token) {
                    tokenScore += 4 * token.length * factor;
                } else if (chunk.startsWith(token)) {
                    tokenScore += 2 * token.length * factor;
                } else if (chunk.includes(token)) {
                    tokenScore += token.length * factor;
                }
            }
        }
        this.score += tokenScore;
    }
}

export default SearchResult;
