import type FNote from "../../entities/fnote.js";
import type FTask from "../../entities/ftask.js";
import froca from "../../services/froca.js";
import TypeWidget from "./type_widget.js";
import * as taskService from "../../services/tasks.js";
import type { EventData } from "../../components/app_context.js";
import dayjs from "dayjs";
import calendarTime from "dayjs/plugin/calendar.js";
import { t } from "../../services/i18n.js";
dayjs.extend(calendarTime);

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

        .note-detail-task-list > header {
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
            cursor: pointer;
        }

        .note-detail-task-list .task-container li:hover {
            background: var(--input-hover-background);
            transition: background 250ms ease-in-out;
        }

        .note-detail-task-list .task-container li > header {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            align-items: center;
        }

        .note-detail-task-list .task-container li .check {
            margin-right: 0.5em;
        }

        .note-detail-task-list .task-container li .title {
            flex-grow: 1;
        }

        .note-detail-task-list .task-container li .due-date {
            font-size: 0.9rem;
        }

        .note-detail-task-list .task-container li.overdue .due-date {
            color: #fd8282;
        }
    </style>
</div>
`;

function buildTasks(tasks: FTask[]) {
    let html = '';

    const now = dayjs();
    const dateFormat = "DD-MM-YYYY";
    for (const task of tasks) {
        const classes = ["task"];

        if (task.dueDate && dayjs(task.dueDate).isBefore(now, "days")) {
            classes.push("overdue");
        }

        html += `<li class="${classes.join(" ")}" data-task-id="${task.taskId}">`;
        html += "<header>";
        html += '<span class="title">';
        html += `<input type="checkbox" class="check" ${task.isDone ? "checked" : ""} />`;
        html += `${task.title}</span>`;
        html += '</span>';
        if (task.dueDate) {
            html += `<span class="due-date">`;
            html += `<span class="bx bx-calendar"></span> `;
            html += dayjs(task.dueDate).calendar(null, {
                sameDay: `[${t("tasks.due.today")}]`,
                nextDay: `[${t("tasks.due.tomorrow")}]`,
                nextWeek: "dddd",
                lastDay: `[${t("tasks.due.yesterday")}]`,
                lastWeek: dateFormat,
                sameElse: dateFormat
            });
            html += "</span>";
        }
        html += "</header>";
        html += `<div class="edit-container"></div>`;
        html += `</li>`;
    }

    return html;
}

function buildEditContainer(task: FTask) {
    return `\
        <label>Due date:</label>
        <input type="date" data-tasks-role="due-date" value="${task.dueDate ?? ""}" />
    `;
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

        this.$taskContainer.on("change", "input.check", (e) => {
            const $target = $(e.target);
            const taskId = $target.closest("li")[0].dataset.taskId;

            if (!taskId) {
                return;
            }

            taskService.toggleTaskDone(taskId);
        });

        this.$taskContainer.on("click", "li", (e) => {
            if ((e.target as HTMLElement).tagName === "INPUT") {
                return;
            }

            const $target = $(e.target);

            // Clear existing edit containers.
            const $existingContainers = this.$taskContainer.find(".edit-container");

            $existingContainers.html("");

            // Add the new edit container.
            const $editContainer = $target.closest("li").find(".edit-container");
            const task = this.#getCorrespondingTask($target);
            if (task) {
                $editContainer.html(buildEditContainer(task));
            }
        });

        this.$taskContainer.on("change", "input:not(.check)", async (e) => {
            const $target = $(e.target);
            const task = this.#getCorrespondingTask($target);
            if (!task) {
                return;
            }

            const role = $target.data("tasks-role");
            const value = String($target.val());

            switch (role) {
                case "due-date":
                    task.dueDate = value;
                    break;
            }

            await taskService.updateTask(task);
        });
    }

    #getCorrespondingTask($target: JQuery<HTMLElement>) {
        const $parentEl = $target.closest("li");
        if (!$parentEl.length) {
            return;
        }
        const taskId = $parentEl[0].dataset.taskId;
        if (!taskId) {
            return;
        }

        return froca.getTask(taskId);
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

    async #getTasks() {
        if (!this.noteId) {
            return [];
        }

        return (await froca.getTasks(this.noteId))
            .toSorted((a, b) => {
                // Sort by due date, closest date first.
                if (!a.dueDate) {
                    return 1;
                }

                if (!b.dueDate) {
                    return -1;
                }

                return a.dueDate.localeCompare(b.dueDate, "en");
            });
    }

    async doRefresh(note: FNote) {
        this.$widget.show();

        if (!this.note || !this.noteId) {
            return;
        }

        const tasks = await this.#getTasks();
        const tasksHtml = buildTasks(tasks);
        this.$taskContainer.html(tasksHtml);
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (this.noteId && loadResults.isTaskListReloaded(this.noteId)) {
            this.refresh();
        }
    }

}
