import server from "./server.js";

interface CreateNewTasksOpts {
    parentNoteId: string;
    title: string;
}

export async function createNewTask({ parentNoteId, title }: CreateNewTasksOpts) {
    await server.post(`tasks`, {
        parentNoteId,
        title
    });
}

export async function toggleTaskDone(taskId: string) {
    await server.post(`tasks/${taskId}/toggle`);
}
