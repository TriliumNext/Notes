import appContext from "../components/app_context.js";
import type { ConfirmDialogOptions, ConfirmDialogResult, ConfirmWithMessageOptions } from "../widgets/dialogs/confirm.js";
import type { PromptDialogOptions } from "../widgets/dialogs/prompt.js";

async function info(message: string) {
    return new Promise((res) => appContext.triggerCommand("showInfoDialog", { message, callback: res }));
}

async function confirm(message: string) {
    return new Promise((res) =>
        appContext.triggerCommand("showConfirmDialog", <ConfirmWithMessageOptions>{
            message,
            callback: (x: false | ConfirmDialogOptions) => res(x && x.confirmed)
        })
    );
}

async function confirmDeleteNoteBoxWithNote(title: string) {
    return new Promise<ConfirmDialogResult | undefined>((res) => appContext.triggerCommand("showConfirmDeleteNoteBoxWithNoteDialog", { title, callback: res }));
}

async function prompt(props: PromptDialogOptions) {
    return new Promise<string | null>((res) => appContext.triggerCommand("showPromptDialog", { ...props, callback: res }));
}

export default {
    info,
    confirm,
    confirmDeleteNoteBoxWithNote,
    prompt
};
