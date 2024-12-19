import dayjs from "dayjs";
import { FNoteRow } from "../entities/fnote.js";
import froca from "./froca.js";
import server from "./server.js";
import ws from "./ws.js";

async function getInboxNote() {
    const note = await server.get<FNoteRow>(`special-notes/inbox/${dayjs().format("YYYY-MM-DD")}`, "date-note");

    return await froca.getNote(note.noteId);
}

async function getTodayNote() {
    return await getDayNote(dayjs().format("YYYY-MM-DD"));
}

async function getDayNote(date: string) {
    const note = await server.get<FNoteRow>(`special-notes/days/${date}`, "date-note");

    await ws.waitForMaxKnownEntityChangeId();

    return await froca.getNote(note.noteId);
}

async function getWeekNote(date: string) {
    const note = await server.get<FNoteRow>(`special-notes/weeks/${date}`, "date-note");

    await ws.waitForMaxKnownEntityChangeId();

    return await froca.getNote(note.noteId);
}

async function getMonthNote(month: string) {
    const note = await server.get<FNoteRow>(`special-notes/months/${month}`, "date-note");

    await ws.waitForMaxKnownEntityChangeId();

    return await froca.getNote(note.noteId);
}

async function getYearNote(year: string) {
    const note = await server.get<FNoteRow>(`special-notes/years/${year}`, "date-note");

    await ws.waitForMaxKnownEntityChangeId();

    return await froca.getNote(note.noteId);
}

async function createSqlConsole() {
    const note = await server.post<FNoteRow>('special-notes/sql-console');

    await ws.waitForMaxKnownEntityChangeId();

    return await froca.getNote(note.noteId);
}

async function createSearchNote(opts = {}) {
    const note = await server.post<FNoteRow>('special-notes/search-note', opts);

    await ws.waitForMaxKnownEntityChangeId();

    return await froca.getNote(note.noteId);
}

export default {
    getInboxNote,
    getTodayNote,
    getDayNote,
    getWeekNote,
    getMonthNote,
    getYearNote,
    createSqlConsole,
    createSearchNote
}
