import type FTask from "../entities/ftask.js";
import server from "./server.js";

interface CreateNewTasksOpts {
    parentNoteId: string;
    title: string;
}

export async function createNewTask({ parentNoteId, title }: CreateNewTasksOpts) {
    await server.post(`tasks`, {
        parentNoteId,
        title: title.trim()
    });
}

export async function toggleTaskDone(taskId: string) {
    await server.post(`tasks/${taskId}/toggle`);
}

export async function updateTask(task: FTask) {
    if (!task.taskId) {
        return;
    }

    await server.patch(`tasks/${task.taskId}/`, {
        taskId: task.taskId,
        dueDate: task.dueDate,
        isDone: task.isDone
    });
}
