import BNote = require("../../src/becca/entities/bnote");
import BBranch = require("../../src/becca/entities/bbranch");
import BAttribute = require("../../src/becca/entities/battribute");
import becca = require("../../src/becca/becca");
import randtoken = require("rand-token");
import SearchResult = require("../../src/services/search/search_result");
import { NoteType } from "../../src/becca/entities/rows";
randtoken.generator({ source: "crypto" });

function findNoteByTitle(
  searchResults: Array<SearchResult>,
  title: string
): BNote | undefined {
  return searchResults
    .map((sr) => becca.notes[sr.noteId])
    .find((note) => note.title === title);
}

class NoteBuilder {
  note: BNote;
  constructor(note: BNote) {
    this.note = note;
  }

  label(name: string, value = "", isInheritable = false) {
    new BAttribute({
      attributeId: id(),
      noteId: this.note.noteId,
      type: "label",
      isInheritable,
      name,
      value,
    });

    return this;
  }

  relation(name: string, targetNote: BNote) {
    new BAttribute({
      attributeId: id(),
      noteId: this.note.noteId,
      type: "relation",
      name,
      value: targetNote.noteId,
    });

    return this;
  }

  child(childNoteBuilder: NoteBuilder, prefix = "") {
    new BBranch({
      branchId: id(),
      noteId: childNoteBuilder.note.noteId,
      parentNoteId: this.note.noteId,
      prefix,
      notePosition: 10,
    });

    return this;
  }
}

function id() {
  return randtoken.generate(10);
}

function note(title: string, extraParams = {}) {
  const row = Object.assign(
    {
      noteId: id(),
      title: title,
      type: "text" as NoteType,
      mime: "text/html",
    },
    extraParams
  );

  const note = new BNote(row);

  return new NoteBuilder(note);
}

export = {
  NoteBuilder,
  findNoteByTitle,
  note,
};
