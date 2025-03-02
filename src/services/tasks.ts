import becca from "../becca/becca.js";
import BTask from "../becca/entities/btask.js";
import type { TaskRow } from "../becca/entities/rows.js";

export function getTasks(parentNoteId: string) {
    return becca.getTasks()
        .filter((task) => task.parentNoteId === parentNoteId && !task.isDone);
}

interface CreateTaskParams {
    parentNoteId: string;
    title: string;
    dueDate?: string;
}

export function createNewTask(params: CreateTaskParams) {
    const task = new BTask(params);
    task.save();

    return {
        task
    }
}

export function toggleTaskDone(taskId: string) {
    const task = becca.tasks[taskId];
    task.isDone = !task.isDone;
    task.save();
}

export function updateTask(taskId: string, content: TaskRow) {
    const task = becca.tasks[taskId];
    task.isDone = !!content.isDone;
    task.dueDate = content.dueDate;
    task.save();
}
