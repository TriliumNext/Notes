"use strict";

import NoteSet from "../note_set.js";
import SearchContext from "../search_context.js";

abstract class Expression {
    name: string;

    constructor() {
        this.name = this.constructor.name; // for DEBUG mode to have expression name as part of dumped JSON
    }

    abstract execute(inputNoteSet: NoteSet, executionContext: {}, searchContext: SearchContext): NoteSet;
}

export default Expression;
