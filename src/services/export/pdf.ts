import type BBranch from "../../becca/entities/bbranch.js";
import type TaskContext from "../task_context.js";

function exportSingleNoteToPdf(taskContext: TaskContext, branch: BBranch, res: Response) {

    // TODO

    taskContext.increaseProgressCount();
    taskContext.taskSucceeded();
}
