import FrontendScriptApi, { type Entity } from "./frontend_script_api.js";
import utils from "./utils.js";
import froca from "./froca.js";

async function ScriptContext(startNoteId: string, allNoteIds: string[], originEntity: Entity | null = null, $container: JQuery<HTMLElement> | null = null) {
    const modules: Record<string, { exports: unknown }> = {};

    await froca.initializedPromise;

    const startNote = await froca.getNote(startNoteId);
    const allNotes = await froca.getNotes(allNoteIds);

    if (!startNote) {
        throw new Error(`Could not find start note ${startNoteId}.`);
    }

    return {
        modules: modules,
        notes: utils.toObject(allNotes, (note) => [note.noteId, note]),
        apis: utils.toObject(allNotes, (note) => [note.noteId, new FrontendScriptApi(startNote, note, originEntity, $container)]),
        require: (moduleNoteIds: string) => {
            return (moduleName: string) => {
                const candidates = allNotes.filter((note) => moduleNoteIds.includes(note.noteId));
                const note = candidates.find((c) => c.title === moduleName);

                if (!note) {
                    throw new Error(`Could not find module note ${moduleName}`);
                }

                return modules[note.noteId].exports;
            };
        }
    };
}

export default ScriptContext;
