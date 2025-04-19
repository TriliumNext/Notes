import dateNoteService from "../../services/date_notes.js";
import sql from "../../services/sql.js";
import cls from "../../services/cls.js";
import specialNotesService, { type LauncherType } from "../../services/special_notes.js";
import becca from "../../becca/becca.js";
import type { Request } from "express";

function getInboxNote(req: Request) {
    return specialNotesService.getInboxNote(req.params.date);
}

function getDayNote(req: Request) {
    return dateNoteService.getDayNote(req.params.date);
}

function getWeekFirstDayNote(req: Request) {
    return dateNoteService.getWeekFirstDayNote(req.params.date);
}

function getWeekNote(req: Request) {
    return dateNoteService.getWeekNote(req.params.week);
}

function getMonthNote(req: Request) {
    return dateNoteService.getMonthNote(req.params.month);
}

function getQuarterNote(req: Request) {
    return dateNoteService.getQuarterNote(req.params.quarter);
}

function getYearNote(req: Request) {
    return dateNoteService.getYearNote(req.params.year);
}

function getDayNotesForMonth(req: Request) {
    const month = req.params.month;
    const calendarRoot = req.query.calendarRoot;
    const query = `\
        SELECT
            attr.value AS date,
            notes.noteId
        FROM notes
        JOIN attributes attr USING(noteId)
        WHERE notes.isDeleted = 0
            AND attr.isDeleted = 0
            AND attr.type = 'label'
            AND attr.name = 'dateNote'
            AND attr.value LIKE '${month}%'`;

    if (calendarRoot) {
        const rows = sql.getRows<{ date: string; noteId: string }>(query);
        const result: Record<string, string> = {};
        for (const { date, noteId } of rows) {
            const note = becca.getNote(noteId);
            if (note?.hasAncestor(String(calendarRoot))) {
                result[date] = noteId;
            }
        }

        return result;
    } else {
        return sql.getMap(query);
    }
}

async function saveSqlConsole(req: Request) {
    return await specialNotesService.saveSqlConsole(req.body.sqlConsoleNoteId);
}

function createSqlConsole() {
    return specialNotesService.createSqlConsole();
}

function saveSearchNote(req: Request) {
    return specialNotesService.saveSearchNote(req.body.searchNoteId);
}

function createSearchNote(req: Request) {
    const hoistedNote = getHoistedNote();
    const searchString = req.body.searchString || "";
    const ancestorNoteId = req.body.ancestorNoteId || hoistedNote?.noteId;

    return specialNotesService.createSearchNote(searchString, ancestorNoteId);
}

function getHoistedNote() {
    return becca.getNote(cls.getHoistedNoteId());
}

function createLauncher(req: Request) {
    return specialNotesService.createLauncher({
        parentNoteId: req.params.parentNoteId,
        // TODO: Validate the parameter
        launcherType: req.params.launcherType as LauncherType
    });
}

function resetLauncher(req: Request) {
    return specialNotesService.resetLauncher(req.params.noteId);
}

function createOrUpdateScriptLauncherFromApi(req: Request) {
    return specialNotesService.createOrUpdateScriptLauncherFromApi(req.body);
}

export default {
    getInboxNote,
    getDayNote,
    getWeekFirstDayNote,
    getWeekNote,
    getMonthNote,
    getQuarterNote,
    getYearNote,
    getDayNotesForMonth,
    createSqlConsole,
    saveSqlConsole,
    createSearchNote,
    saveSearchNote,
    createLauncher,
    resetLauncher,
    createOrUpdateScriptLauncherFromApi
};
