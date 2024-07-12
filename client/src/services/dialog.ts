import appContext from "../components/app_context.js";

async function info(message: string) {
    return new Promise(res =>
        appContext.triggerCommand("showInfoDialog", {message, callback: res}));
}

async function confirm(message: string) {
    return new Promise<boolean>(res =>
        appContext.triggerCommand("showConfirmDialog", {
            message,
            callback: x => res(x.confirmed)
        }));
}

async function confirmDeleteNoteBoxWithNote(title: string) {
    return new Promise(res =>
        appContext.triggerCommand("showConfirmDeleteNoteBoxWithNoteDialog", {title, callback: res}));
}

async function prompt(props: any) {
    return new Promise(res =>
        appContext.triggerCommand("showPromptDialog", {...props, callback: res}));
}

export default {
    info,
    confirm,
    confirmDeleteNoteBoxWithNote,
    prompt
};
