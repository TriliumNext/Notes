import { describe, expect, it } from "vitest";
import { buildNote, buildNotes } from "../../test/easy-froca.js";
import CalendarView from "./calendar_view.js";

describe("Building events", () => {
    it("supports start date", async () => {
        const noteIds = buildNotes([
            { title: "Note 1", "#startDate": "2025-05-05" },
            { title: "Note 2", "#startDate": "2025-05-07" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ title: "Note 1", start: "2025-05-05", end: "2025-05-06" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07", end: "2025-05-08" });
    });

    it("ignores notes with only end date", async () => {
        const noteIds = buildNotes([
            { title: "Note 1", "#endDate": "2025-05-05" },
            { title: "Note 2", "#endDateDate": "2025-05-07" }
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(0);
    });

    it("supports both start date and end date", async () => {
        const noteIds = buildNotes([
            { title: "Note 1", "#startDate": "2025-05-05", "#endDate": "2025-05-05" },
            { title: "Note 2", "#startDate": "2025-05-07", "#endDate": "2025-05-08" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ title: "Note 1", start: "2025-05-05", end: "2025-05-06" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07", end: "2025-05-09" });
    });

    it("supports custom start date", async () => {
        const noteIds = buildNotes([
            { title: "Note 1", "#myStartDate": "2025-05-05", "#calendar:startDate": "#myStartDate" },
            { title: "Note 2", "#startDate": "2025-05-07", "#calendar:startDate": "#myStartDate" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({
            title: "Note 1",
            start: "2025-05-05",
            end: "2025-05-06"
        });
        expect(events[1]).toMatchObject({
            title: "Note 2",
            start: "2025-05-07",
            end: "2025-05-08"
        });
    });

    it("supports custom start date and end date", async () => {
        const noteIds = buildNotes([
            { title: "Note 1", "#myStartDate": "2025-05-05", "#myEndDate": "2025-05-05", "#calendar:startDate": "#myStartDate", "#calendar:endDate": "#myEndDate" },
            { title: "Note 2", "#myStartDate": "2025-05-07", "#endDate": "2025-05-08", "#calendar:startDate": "#myStartDate", "#calendar:endDate": "#myEndDate" },
            { title: "Note 3", "#startDate": "2025-05-05", "#myEndDate": "2025-05-05", "#calendar:startDate": "#myStartDate", "#calendar:endDate": "#myEndDate" },
            { title: "Note 4", "#startDate": "2025-05-07", "#myEndDate": "2025-05-08", "#calendar:startDate": "#myStartDate", "#calendar:endDate": "#myEndDate" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(4);
        expect(events[0]).toMatchObject({ title: "Note 1", start: "2025-05-05", end: "2025-05-06" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07", end: "2025-05-09" });
        expect(events[2]).toMatchObject({ title: "Note 3", start: "2025-05-05", end: "2025-05-06" });
        expect(events[3]).toMatchObject({ title: "Note 4", start: "2025-05-07", end: "2025-05-09" });
    });

    it("supports label as custom title", async () => {
        const noteIds = buildNotes([
            { title: "Note 1", "#myTitle": "My Custom Title 1", "#startDate": "2025-05-05", "#calendar:title": "#myTitle" },
            { title: "Note 2", "#startDate": "2025-05-07", "#calendar:title": "#myTitle" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ title: "My Custom Title 1", start: "2025-05-05" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07" });
    });

    it("supports relation as custom title", async () => {
        const noteIds = buildNotes([
            { id: "mySharedTitle", title: "My shared title" },
            { title: "Note 1", "~myTitle": "mySharedTitle", "#startDate": "2025-05-05", "#calendar:title": "~myTitle" },
            { title: "Note 2", "#startDate": "2025-05-07", "#calendar:title": "~myTitle" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ title: "My shared title", start: "2025-05-05" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07" });
    });

    it("supports relation as custom title with custom label", async () => {
        const noteIds = buildNotes([
            { id: "mySharedTitle", title: "My custom title", "#myTitle": "My shared custom title", "#calendar:title": "#myTitle" },
            { title: "Note 1", "~myTitle": "mySharedTitle", "#startDate": "2025-05-05", "#calendar:title": "~myTitle" },
            { title: "Note 2", "#startDate": "2025-05-07", "#calendar:title": "~myTitle" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ title: "My shared custom title", start: "2025-05-05" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07" });
    });

    it("discards relation as custom title with custom relation", async () => {
        const noteIds = buildNotes([
            { id: "myParentNote", title: "My parent note" },
            { id: "mySharedTitle", title: "My custom title", "~myTitle": "myParentNote", "#calendar:title": "~myTitle" },
            { title: "Note 1", "~myTitle": "mySharedTitle", "#startDate": "2025-05-05", "#calendar:title": "~myTitle" },
            { title: "Note 2", "#startDate": "2025-05-07", "#calendar:title": "~myTitle" },
        ]);
        const events = await CalendarView.buildEvents(noteIds);

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ title: "My shared custom title", start: "2025-05-05" });
        expect(events[1]).toMatchObject({ title: "Note 2", start: "2025-05-07" });
    });

});

describe("Promoted attributes", () => {
    it("supports labels", async () => {
        const note = buildNote({
            "title": "Hello",
            "#weight": "75",
            "#mood": "happy",
            "#label:weight": "promoted,number,single,precision=1",
            "#label:mood": "promoted,alias=Mood,single,text",
            "#calendar:promotedAttributes": "label:weight,label:mood"
        });

        const event = await CalendarView.buildEvent(note, "2025-04-04");
        expect(event).toHaveLength(1);
        expect(event[0]?.promotedAttributes).toMatchObject({
            weight: "75",
            Mood: "happy"
        })
    });

    it("supports relations", async () => {
        const note = buildNote({
            "title": "Hello",
            "~assignee": buildNote({
                "title": "Target note"
            }).noteId,
            "#calendar:promotedAttributes": "relation:assignee",
            "#relation:assignee": "promoted,alias=Assignee,single,text",
        });

        const event = await CalendarView.buildEvent(note, "2025-04-04");
        expect(event).toHaveLength(1);
        expect(event[0]?.promotedAttributes).toMatchObject({
            "Assignee": "Target note"
        })
    });
});
