import appContext from "../components/app_context.js";
import protectedSessionHolder from "./protected_session_holder.js";
import server from "./server.js";
import ws from "./ws.js";
import froca from "./froca.js";
import treeService from "./tree.js";
import toastService from "./toast.js";
import { t } from "./i18n.js";
import FNote from "../entities/fnote.js";
import FBranch from "../entities/fbranch.js";
import { ChooseNoteTypeResponse } from "../widgets/dialogs/note_type_chooser.js";

interface CreateNoteOpts {
    isProtected?: boolean;
    saveSelection?: boolean;
    title?: string | null;
    content?: string | null;
    type?: string;
    mime?: string;
    templateNoteId?: string;
    activate?: boolean;
    focus?: "title" | "content";
    target?: string;
    targetBranchId?: string;
    textEditor?: {
        // TODO: Replace with interface once note_context.js is converted.
        getSelectedHtml(): string;
        removeSelection(): void;
    }
}

interface Response {
    // TODO: Deduplicate with server once we have client/server architecture.
    note: FNote;
    branch: FBranch;
}

interface DuplicateResponse {
    // TODO: Deduplicate with server once we have client/server architecture.
    note: FNote;
}

async function createNote(parentNotePath: string | undefined, options: CreateNoteOpts = {}) {
    options = Object.assign({
        activate: true,
        focus: 'title',
        target: 'into'
    }, options);

    // if isProtected isn't available (user didn't enter password yet), then note is created as unencrypted,
    // but this is quite weird since the user doesn't see WHERE the note is being created, so it shouldn't occur often
    if (!options.isProtected || !protectedSessionHolder.isProtectedSessionAvailable()) {
        options.isProtected = false;
    }

    if (appContext.tabManager.getActiveContextNoteType() !== 'text') {
        options.saveSelection = false;
    }

    if (options.saveSelection && options.textEditor) {        
        [options.title, options.content] = parseSelectedHtml(options.textEditor.getSelectedHtml());
    }

    const parentNoteId = treeService.getNoteIdFromUrl(parentNotePath);

    if (options.type === 'mermaid' && !options.content) {
        options.content = `graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;`
    }

    const {note, branch} = await server.post<Response>(`notes/${parentNoteId}/children?target=${options.target}&targetBranchId=${options.targetBranchId || ""}`, {
        title: options.title,
        content: options.content || "",
        isProtected: options.isProtected,
        type: options.type,
        mime: options.mime,
        templateNoteId: options.templateNoteId
    });

    if (options.saveSelection) {
        // we remove the selection only after it was saved to server to make sure we don't lose anything
        options.textEditor?.removeSelection();
    }

    await ws.waitForMaxKnownEntityChangeId();

    if (options.activate) {
        const activeNoteContext = appContext.tabManager.getActiveContext();
        await activeNoteContext.setNote(`${parentNotePath}/${note.noteId}`);

        if (options.focus === 'title') {
            appContext.triggerEvent('focusAndSelectTitle', {isNewNote: true});
        }
        else if (options.focus === 'content') {
            appContext.triggerEvent('focusOnDetail', {ntxId: activeNoteContext.ntxId});
        }
    }

    const noteEntity = await froca.getNote(note.noteId);
    const branchEntity = froca.getBranch(branch.branchId);

    return {
        note: noteEntity,
        branch: branchEntity
    };
}

async function chooseNoteType() {
    return new Promise<ChooseNoteTypeResponse>(res => {
        // TODO: Remove ignore after callback for chooseNoteType is defined in app_context.ts
        //@ts-ignore
        appContext.triggerCommand("chooseNoteType", {callback: res});
    });
}

async function createNoteWithTypePrompt(parentNotePath: string, options: CreateNoteOpts = {}) {
    const {success, noteType, templateNoteId} = await chooseNoteType();

    if (!success) {
        return;
    }

    options.type = noteType;
    options.templateNoteId = templateNoteId;

    return await createNote(parentNotePath, options);
}

/* If the first element is heading, parse it out and use it as a new heading. */
function parseSelectedHtml(selectedHtml: string) {
    const dom = $.parseHTML(selectedHtml);

    // TODO: tagName and outerHTML appear to be missing.
    //@ts-ignore
    if (dom.length > 0 && dom[0].tagName && dom[0].tagName.match(/h[1-6]/i)) {
        const title = $(dom[0]).text();
        // remove the title from content (only first occurrence)
        // TODO: tagName and outerHTML appear to be missing.
        //@ts-ignore
        const content = selectedHtml.replace(dom[0].outerHTML, "");

        return [title, content];
    }
    else {
        return [null, selectedHtml];
    }
}

async function duplicateSubtree(noteId: string, parentNotePath: string) {
    const parentNoteId = treeService.getNoteIdFromUrl(parentNotePath);
    const {note} = await server.post<DuplicateResponse>(`notes/${noteId}/duplicate/${parentNoteId}`);

    await ws.waitForMaxKnownEntityChangeId();

    const activeNoteContext = appContext.tabManager.getActiveContext();
    activeNoteContext.setNote(`${parentNotePath}/${note.noteId}`);

    const origNote = await froca.getNote(noteId);
    toastService.showMessage(t("note_create.duplicated", { title: origNote?.title }));
}

export default {
    createNote,
    createNoteWithTypePrompt,
    duplicateSubtree,
    chooseNoteType
};
