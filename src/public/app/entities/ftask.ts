import type { Froca } from "../services/froca-interface.js";

export interface FTaskRow {
    taskId: string;
    parentNoteId: string;
    title: string;
    dueDate?: string;
    isDone?: boolean;
    utcDateModified: string;
}

export default class FTask {
    private froca: Froca;
    taskId!: string;
    parentNoteId!: string;
    title!: string;
    dueDate?: string;
    isDone!: boolean;
    utcDateModified!: string;

    constructor(froca: Froca, row: FTaskRow) {
        this.froca = froca;
        this.update(row);
    }

    update(row: FTaskRow) {
        this.taskId = row.taskId;
        this.parentNoteId = row.parentNoteId;
        this.title = row.title;
        this.dueDate = row.dueDate;
        this.isDone = !!row.isDone;
        this.utcDateModified = row.utcDateModified;
    }
}
