import type { Request } from "express";
import * as tasksService from "../../services/tasks.js";

export function getTasks(req: Request) {
    const { parentNoteId } = req.params;
    return tasksService.getTasks(parentNoteId);
}

export function createNewTask(req: Request) {
    return tasksService.createNewTask(req.body);
}

export function toggleTaskDone(req: Request) {
    const { taskId } = req.params;
    if (!taskId) {
        return;
    }

    return tasksService.toggleTaskDone(taskId);
}
