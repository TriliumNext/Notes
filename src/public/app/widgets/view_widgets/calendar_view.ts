import type { Calendar, DateSelectArg, EventChangeArg, EventDropArg, EventSourceInput, PluginDef } from "@fullcalendar/core";
import froca from "../../services/froca.js";
import ViewMode, { type ViewModeArgs } from "./view_mode.js";
import type FNote from "../../entities/fnote.js";
import server from "../../services/server.js";
import ws from "../../services/ws.js";
import { t } from "../../services/i18n.js";
import options from "../../services/options.js";
import dialogService from "../../services/dialog.js";
import attributes from "../../services/attributes.js";
import type { EventData } from "../../components/app_context.js";

const TPL = `
<div class="calendar-view">
    <style>
    .calendar-view {
        overflow: hidden;
        position: relative;
        height: 100%;
        user-select: none;
        padding: 10px;
    }

    .calendar-view a {
        color: unset;
    }

    .calendar-container {
        height: 100%;
    }

    .calendar-container .fc-toolbar.fc-header-toolbar {
        margin-bottom: 0.5em;
    }

    body.desktop:not(.zen) .calendar-container .fc-toolbar.fc-header-toolbar {
        padding-right: 5em;
    }

    .calendar-container .fc-toolbar-title {
        font-size: 1.3rem;
        font-weight: normal;
    }

    .calendar-container .fc-button {
        padding: 0.2em 0.5em;
    }
    </style>

    <div class="calendar-container">
    </div>
</div>
`;

// TODO: Deduplicate
interface CreateChildResponse {
    note: {
        noteId: string;
    }
}

export default class CalendarView extends ViewMode {

    private $root: JQuery<HTMLElement>;
    private $calendarContainer: JQuery<HTMLElement>;
    private noteIds: string[];
    private parentNote: FNote;
    private calendar?: Calendar;

    constructor(args: ViewModeArgs) {
        super(args);

        this.$root = $(TPL);
        this.$calendarContainer = this.$root.find(".calendar-container");
        this.noteIds = args.noteIds;
        this.parentNote = args.parentNote;
        console.log(args);
        args.$parent.append(this.$root);
    }

    async renderList(): Promise<JQuery<HTMLElement> | undefined> {
        const isEditable = true;

        const { Calendar } = await import("@fullcalendar/core");
        const plugins: PluginDef[] = [];
        plugins.push((await import("@fullcalendar/daygrid")).default);

        if (isEditable) {
            plugins.push((await import("@fullcalendar/interaction")).default);
        }

        const calendar = new Calendar(this.$calendarContainer[0], {
            plugins,
            initialView: "dayGridMonth",
            events: async () => await CalendarView.#buildEvents(this.noteIds),
            editable: isEditable,
            selectable: isEditable,
            select: (e) => this.#onCalendarSelection(e),
            eventChange: (e) => this.#onEventMoved(e),
            firstDay: options.getInt("firstDayOfWeek") ?? 0,
            locale: await CalendarView.#getLocale()
        });
        calendar.render();
        this.calendar = calendar;

        return this.$root;
    }

    static async #getLocale() {
        const locale = options.get("locale");

        // Here we hard-code the imports in order to ensure that they are embedded by webpack without having to load all the languages.
        switch (locale) {
            case "de":
                return (await import("@fullcalendar/core/locales/de")).default;
            case "es":
                return (await import("@fullcalendar/core/locales/es")).default;
            case "fr":
                return (await import("@fullcalendar/core/locales/fr")).default;
            case "cn":
                return (await import("@fullcalendar/core/locales/zh-cn")).default;
            case "tw":
                return (await import("@fullcalendar/core/locales/zh-tw")).default;
            case "ro":
                return (await import("@fullcalendar/core/locales/ro")).default;
            case "en":
            default:
                return undefined;
        }
    }

    async #onCalendarSelection(e: DateSelectArg) {
        const startDate = CalendarView.#formatDateToLocalISO(e.start);
        if (!startDate) {
            return;
        }

        const endDate = CalendarView.#formatDateToLocalISO(CalendarView.#offsetDate(e.end, -1));

        const title = await dialogService.prompt({ message: t("relation_map.enter_title_of_new_note"), defaultValue: t("relation_map.default_new_note_title") });
        if (!title?.trim()) {
            return;
        }

        const { note } = await server.post<CreateChildResponse>(`notes/${this.parentNote.noteId}/children?target=into`, {
            title,
            content: "",
            type: "text"
        });
        attributes.setLabel(note.noteId, "startDate", startDate);
        if (endDate) {
            attributes.setLabel(note.noteId, "endDate", endDate);
        }
    }

    async #onEventMoved(e: EventChangeArg) {
        const startDate = CalendarView.#formatDateToLocalISO(e.event.start);
        // Fullcalendar end date is exclusive, not inclusive but we store it the other way around.
        let endDate = CalendarView.#formatDateToLocalISO(CalendarView.#offsetDate(e.event.end, -1));
        const noteId = e.event.extendedProps.noteId;

        // Don't store the end date if it's empty.
        if (endDate === startDate) {
            endDate = undefined;
        }

        // Update start date
        const note = await froca.getNote(noteId);
        if (!note) {
            return;
        }
        if(note.getAttributeValue("label", "startDate"))
            CalendarView.#setAttribute(note, "label", "startDate", startDate);
        else
            CalendarView.#setAttribute(note, "label", "dateNote", startDate);
        CalendarView.#setAttribute(note, "label", "endDate", endDate);
    }

    entitiesReloadedEvents({ loadResults }: EventData<"entitiesReloaded">): void {
        // Refresh note IDs if they got changed.
        if (loadResults.getBranchRows().some((branch) => branch.parentNoteId == this.parentNote.noteId)) {
            this.noteIds = this.parentNote.getChildNoteIds();
        }

        if (this.calendar && loadResults.getAttributeRows().some((a) => this.noteIds.includes(a.noteId ?? ""))) {
            this.calendar.refetchEvents();
        }
    }

    static async #buildEvents(noteIds: string[]) {
        const notes = await froca.getNotes(noteIds);
        const events: EventSourceInput = [];

        for (const note of notes) {
            const startDate = note.getAttributeValue("label", "startDate") ?? note.getAttributeValue("label", "dateNote");
            const customTitle = note.getAttributeValue("label", "calendar:title");
            const color = note.getAttributeValue("label", "calendar:color") ??  note.getAttributeValue("label", "color") ?? undefined;

            if (!startDate) {
                continue;
            }

            const titles = await CalendarView.#parseCustomTitle(customTitle, note);
            for (const title of titles) {
                const eventData: typeof events[0] = {
                    title: title,
                    start: startDate,
                    url: `#${note.noteId}`,
                    noteId: note.noteId,
                    color: color,
                };

                const endDate = CalendarView.#offsetDate(note.getAttributeValue("label", "endDate") ?? startDate, 1);
                if (endDate) {
                    eventData.end = CalendarView.#formatDateToLocalISO(endDate);
                }

                events.push(eventData);
            }
        }

        return events;
    }

    static async #parseCustomTitle(customTitleValue: string | null, note: FNote, allowRelations = true): Promise<string[]> {
        if (customTitleValue) {
            const attributeName = customTitleValue.substring(1);
            if (customTitleValue.startsWith("#")) {
                const labelValue = note.getAttributeValue("label", attributeName);
                if (labelValue) {
                    return [ labelValue ];
                }
            } else if (allowRelations && customTitleValue.startsWith("~")) {
                const relations = note.getRelations(attributeName);
                if (relations.length > 0) {
                    const noteIds = relations.map((r) => r.targetNoteId);
                    const notesFromRelation = await froca.getNotes(noteIds);
                    const titles = [];

                    for (const targetNote of notesFromRelation) {
                        const targetCustomTitleValue = targetNote.getAttributeValue("label", "calendar:title");
                        const targetTitles = await CalendarView.#parseCustomTitle(targetCustomTitleValue, targetNote, false);
                        titles.push(targetTitles.flat());
                    }

                    return titles.flat();
                }
            }
        }

        return [ note.title ];
    }

    static async #setAttribute(note: FNote, type: "label" | "relation", name: string, value: string | null | undefined) {
        if (value) {
            // Create or update the attribute.
            await server.put(`notes/${note.noteId}/set-attribute`, { type, name, value });
        } else {
            // Remove the attribute if it exists on the server but we don't define a value for it.
            const attributeId = note.getAttribute(type, name)?.attributeId;
            if (attributeId) {
                await server.remove(`notes/${note.noteId}/attributes/${attributeId}`);
            }
        }
        await ws.waitForMaxKnownEntityChangeId();
    }

    static #formatDateToLocalISO(date: Date | null | undefined) {
        if (!date) {
            return undefined;
        }

        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - offset * 60 * 1000);
        return localDate.toISOString().split('T')[0];
    }

    static #offsetDate(date: Date | string | null | undefined, offset: number) {
        if (!date) {
            return undefined;
        }

        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + offset);
        return newDate;
    }

}
