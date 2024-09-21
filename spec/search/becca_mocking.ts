import BNote from "../../src/becca/entities/bnote.js";
import BBranch from "../../src/becca/entities/bbranch.js";
import BAttribute from "../../src/becca/entities/battribute.js";
import becca from "../../src/becca/becca.js";
import randtoken from "rand-token";
import SearchResult from "../../src/services/search/search_result.js";
import { NoteType } from "../../src/becca/entities/rows.js";
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

export default {
  NoteBuilder,
  findNoteByTitle,
  note,
};
