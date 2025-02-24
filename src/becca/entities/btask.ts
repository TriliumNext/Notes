import date_utils from "../../services/date_utils.js";
import AbstractBeccaEntity from "./abstract_becca_entity.js";
import type BOption from "./boption.js";
import type { TaskRow } from "./rows.js";

export default class BTask extends AbstractBeccaEntity<BOption> {

    static get entityName() {
        return "tasks";
    }

    static get primaryKeyName() {
        return "taskId";
    }

    static get hashedProperties() {
        return [ "taskId", "parentNoteId", "title", "dueDate", "isDone", "isDeleted" ];
    }

    taskId?: string;
    parentNoteId!: string;
    title!: string;
    dueDate?: string;
    isDone!: boolean;
    private _isDeleted?: boolean;

    constructor(row?: TaskRow) {
        super();

        if (!row) {
            return;
        }

        this.updateFromRow(row);
        this.init();
    }

    get isDeleted() {
        return !!this._isDeleted;
    }

    updateFromRow(row: TaskRow) {
        this.taskId = row.taskId;
        this.parentNoteId = row.parentNoteId;
        this.title = row.title;
        this.dueDate = row.dueDate;
        this.isDone = !!row.isDone;
        this._isDeleted = !!row.isDeleted;
        this.utcDateModified = row.utcDateModified;

        if (this.taskId) {
            this.becca.tasks[this.taskId] = this;
        }
    }

    init() {
        if (this.taskId) {
            this.becca.tasks[this.taskId] = this;
        }
    }

    protected beforeSaving(opts?: {}): void {
        super.beforeSaving();

        this.utcDateModified = date_utils.utcNowDateTime();

        if (this.taskId) {
            this.becca.tasks[this.taskId] = this;
        }
    }

    getPojo() {
        return {
            taskId: this.taskId,
            parentNoteId: this.parentNoteId,
            title: this.title,
            dueDate: this.dueDate,
            isDone: this.isDone,
            isDeleted: this.isDeleted,
            utcDateModified: this.utcDateModified
        };
    }

}
