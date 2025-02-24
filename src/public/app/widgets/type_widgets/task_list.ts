import type FNote from "../../entities/fnote.js";
import type FTask from "../../entities/ftask.js";
import froca from "../../services/froca.js";
import TypeWidget from "./type_widget.js";
import * as taskService from "../../services/tasks.js";
import type { EventData } from "../../components/app_context.js";

const TPL = `
<div class="note-detail-task-list note-detail-printable">

    <header>
        <input type="text" placeholder="Add a new task" class="add-new-task" />
    </header>

    <ol class="task-container">
    </ol>

    <style>
        .note-detail-task-list {
            height: 100%;
            contain: none;
            padding: 10px;
        }

        .note-detail-task-list header {
            position: sticky;
            top: 0;
            z-index: 100;
            margin: 0;
            padding: 0.5em 0;
            background-color: var(--main-background-color);
        }

        .note-detail-task-list .add-new-task {
            width: 100%;
            padding: 0.25em 0.5em;
        }

        .note-detail-task-list .task-container {
            list-style-type: none;
            margin: 0;
            padding: 0;
            border-radius: var(--bs-border-radius);
            overflow: hidden;
        }

        .note-detail-task-list .task-container li {
            background: var(--input-background-color);
            border-bottom: 1px solid var(--main-background-color);
            padding: 0.5em 1em;
        }

        .note-detail-task-list .task-container li .check {
            margin-right: 0.5em;
        }
    </style>
</div>
`;

function buildTasks(tasks: FTask[]) {
    let html = '';

    for (const task of tasks) {
        html += `<li class="task"><input type="checkbox" class="check" data-task-id="${task.taskId}" ${task.isDone ? "checked" : ""} />${task.title}</li>`;
    }

    return html;
}

export default class TaskListWidget extends TypeWidget {

    private $taskContainer!: JQuery<HTMLElement>;
    private $addNewTask!: JQuery<HTMLElement>;

    static getType() { return "taskList" }

    doRender() {
        this.$widget = $(TPL);
        this.$addNewTask = this.$widget.find(".add-new-task");
        this.$taskContainer = this.$widget.find(".task-container");

        this.$addNewTask.on("keydown", (e) => {
            if (e.key === "Enter") {
                this.#createNewTask(String(this.$addNewTask.val()));
                this.$addNewTask.val("");
            }
        });

        this.$taskContainer.on("change", "input", (e) => {
            const target = e.target as HTMLInputElement;
            const taskId = target.dataset.taskId;

            if (!taskId) {
                return;
            }

            taskService.toggleTaskDone(taskId);
        });
    }

    async #createNewTask(title: string) {
        if (!title || !this.noteId) {
            return;
        }

        await taskService.createNewTask({
            title,
            parentNoteId: this.noteId
        });
    }

    async doRefresh(note: FNote) {
        this.$widget.show();

        if (!this.note || !this.noteId) {
            return;
        }

        const tasks = await froca.getTasks(this.noteId);
        const tasksHtml = buildTasks(tasks);
        this.$taskContainer.html(tasksHtml);
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (this.noteId && loadResults.isTaskListReloaded(this.noteId)) {
            this.refresh();
        }
    }

}
