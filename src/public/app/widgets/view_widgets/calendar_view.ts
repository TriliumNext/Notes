import type { Calendar, DateSelectArg, EventChangeArg, EventDropArg, EventInput, EventSourceFunc, EventSourceFuncArg, EventSourceInput, PluginDef } from "@fullcalendar/core";
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
import utils from "../../services/utils.js";
import date_notes from "../../services/date_notes.js";
import appContext from "../../components/app_context.js";

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

    .calendar-container a.fc-event {
        text-decoration: none;
    }

    .calendar-container .fc-button {
        padding: 0.2em 0.5em;
    }

    .calendar-container .promoted-attribute {
        font-size: 0.85em;
        opacity: 0.85;
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
    private isCalendarRoot: boolean;

    constructor(args: ViewModeArgs) {
        super(args);

        this.$root = $(TPL);
        this.$calendarContainer = this.$root.find(".calendar-container");
        this.noteIds = args.noteIds;
        this.parentNote = args.parentNote;
        this.isCalendarRoot = false;
        args.$parent.append(this.$root);
    }

    get isFullHeight(): boolean {
        return true;
    }

    async renderList(): Promise<JQuery<HTMLElement> | undefined> {
        this.isCalendarRoot = this.parentNote.hasLabel("calendarRoot") || this.parentNote.hasLabel("workspaceCalendarRoot");
        const isEditable = !this.isCalendarRoot;

        const { Calendar } = await import("@fullcalendar/core");
        const plugins: PluginDef[] = [];
        plugins.push((await import("@fullcalendar/daygrid")).default);
        if (isEditable || this.isCalendarRoot) {
            plugins.push((await import("@fullcalendar/interaction")).default);
        }

        let eventBuilder: EventSourceFunc;
        if (!this.isCalendarRoot) {
            eventBuilder = async () => await CalendarView.buildEvents(this.noteIds)
        } else {
            eventBuilder = async (e: EventSourceFuncArg) => await this.#buildEventsForCalendar(e);
        }

        const calendar = new Calendar(this.$calendarContainer[0], {
            plugins,
            initialView: "dayGridMonth",
            events: eventBuilder,
            editable: isEditable,
            selectable: isEditable,
            select: (e) => this.#onCalendarSelection(e),
            eventChange: (e) => this.#onEventMoved(e),
            firstDay: options.getInt("firstDayOfWeek") ?? 0,
            weekends: !this.parentNote.hasAttribute("label", "calendar:hideWeekends"),
            weekNumbers: this.parentNote.hasAttribute("label", "calendar:weekNumbers"),
            locale: await CalendarView.#getLocale(),
            height: "100%",
            eventContent: (e => {
                let html = "";
                const { iconClass, promotedAttributes } = e.event.extendedProps;

                // Title and icon
                if (iconClass) {
                    html += `<span class="${iconClass}"></span> `;
                }
                html += utils.escapeHtml(e.event.title);

                // Promoted attributes
                if (promotedAttributes) {
                    for (const [ name, value ] of Object.entries(promotedAttributes)) {
                        html += `\
                        <div class="promoted-attribute">
                            <span class="promoted-attribute-name">${name}</span>: <span class="promoted-attribute-value">${value}</span>
                        </div>`;
                    }
                }

                return { html };
            }),
            dateClick: async (e) => {
                if (!this.isCalendarRoot) {
                    return;
                }

                const note = await date_notes.getDayNote(e.dateStr);
                if (note) {
                    appContext.tabManager.getActiveContext().setNote(note.noteId);
                }
            }
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

        CalendarView.#setAttribute(note, "label", "startDate", startDate);
        CalendarView.#setAttribute(note, "label", "endDate", endDate);
    }

    onEntitiesReloaded({ loadResults }: EventData<"entitiesReloaded">) {
        // Refresh note IDs if they got changed.
        if (loadResults.getBranchRows().some((branch) => branch.parentNoteId === this.parentNote.noteId)) {
            this.noteIds = this.parentNote.getChildNoteIds();
        }

        // Refresh calendar on attribute change.
        if (loadResults.getAttributeRows().some((attribute) => attribute.noteId === this.parentNote.noteId && attribute.name?.startsWith("calendar:"))) {
            return true;
        }

        // Refresh dataset on subnote change.
        if (this.calendar && loadResults.getAttributeRows().some((a) => this.noteIds.includes(a.noteId ?? ""))) {
            this.calendar.refetchEvents();
        }
    }

    async #buildEventsForCalendar(e: EventSourceFuncArg) {
        const events = [];

        // Gather all the required date note IDs.
        const dateRange = utils.getMonthsInDateRange(e.startStr, e.endStr);
        let allDateNoteIds: string[] = [];
        for (const month of dateRange) {
            // TODO: Deduplicate get type.
            const dateNotesForMonth = await server.get<Record<string, string>>(`special-notes/notes-for-month/${month}?calendarRoot=${this.parentNote.noteId}`);
            const dateNoteIds = Object.values(dateNotesForMonth);
            allDateNoteIds = [ ...allDateNoteIds, ...dateNoteIds ];
        }

        // Request all the date notes.
        const dateNotes = await froca.getNotes(allDateNoteIds);
        const childNoteToDateMapping: Record<string, string> = {};
        for (const dateNote of dateNotes) {
            const startDate = dateNote.getLabelValue("dateNote");
            if (!startDate) {
                continue;
            }

            events.push(await CalendarView.buildEvent(dateNote, startDate));

            if (dateNote.hasChildren()) {
                const childNoteIds = dateNote.getChildNoteIds();
                for (const childNoteId of childNoteIds) {
                    childNoteToDateMapping[childNoteId] = startDate;
                }
            }
        }

        // Request all child notes of date notes in a single run.
        const childNoteIds = Object.keys(childNoteToDateMapping);
        const childNotes = await froca.getNotes(childNoteIds);
        for (const childNote of childNotes) {
            const startDate = childNoteToDateMapping[childNote.noteId];
            const event = await CalendarView.buildEvent(childNote, startDate);
            events.push(event);
        }

        return events.flat();
    }

    static async buildEvents(noteIds: string[]) {
        const notes = await froca.getNotes(noteIds);
        const events: EventSourceInput = [];

        for (const note of notes) {
            const startDate = CalendarView.#getCustomisableLabel(note, "startDate", "calendar:startDate");

            if (note.hasChildren()) {
                const childrenEventData = await this.buildEvents(note.getChildNoteIds());
                if (childrenEventData.length > 0) {
                    events.push(childrenEventData);
                }
            }

            if (!startDate) {
                continue;
            }

            const endDate = CalendarView.#getCustomisableLabel(note, "endDate", "calendar:endDate");
            events.push(await CalendarView.buildEvent(note, startDate, endDate));
        }

        return events.flat();
    }

    /**
     * Allows the user to customize the attribute from which to obtain a particular value. For example, if `customLabelNameAttribute` is `calendar:startDate`
     * and `defaultLabelName` is `startDate` and the note at hand has `#calendar:startDate=#myStartDate #myStartDate=2025-02-26` then the value returned will
     * be `2025-02-26`. If there is no custom attribute value, then the value of the default attribute is returned instead (e.g. `#startDate`).
     *
     * @param note the note from which to read the values.
     * @param defaultLabelName the name of the label in case a custom value is not found.
     * @param customLabelNameAttribute the name of the label to look for a custom value.
     * @returns the value of either the custom label or the default label.
     */
    static #getCustomisableLabel(note: FNote, defaultLabelName: string, customLabelNameAttribute: string) {
        const customAttributeName = note.getLabelValue(customLabelNameAttribute);
        if (customAttributeName?.startsWith("#")) {
            const customValue = note.getLabelValue(customAttributeName.substring(1));
            if (customValue) {
                return customValue;
            }
        }

        return note.getLabelValue(defaultLabelName);
    }

    static async buildEvent(note: FNote, startDate: string, endDate?: string | null) {
        const customTitle = note.getLabelValue("calendar:title");
        const titles = await CalendarView.#parseCustomTitle(customTitle, note);
        const color = note.getLabelValue("calendar:color") ?? note.getLabelValue("color");
        const events: EventInput[] = [];

        const calendarPromotedAttributes = note.getLabelValue("calendar:promotedAttributes");
        let promotedAttributesData = null;
        if (calendarPromotedAttributes) {
            promotedAttributesData = await this.#buildPromotedAttributes(note, calendarPromotedAttributes);
        }

        for (const title of titles) {
            const eventData: EventInput = {
                title: title,
                start: startDate,
                url: `#${note.noteId}`,
                noteId: note.noteId,
                color: color ?? undefined,
                iconClass: note.getLabelValue("iconClass"),
                promotedAttributes: promotedAttributesData
            };

            const endDateOffset = CalendarView.#offsetDate(endDate ?? startDate, 1);
            if (endDateOffset) {
                eventData.end = CalendarView.#formatDateToLocalISO(endDateOffset);
            }
            events.push(eventData);
        }
        return events;
    }

    static async #buildPromotedAttributes(note: FNote, calendarPromotedAttributes: string) {
        const promotedAttributeNames = calendarPromotedAttributes.split(",");
        const filteredPromotedAttributes = note.getPromotedDefinitionAttributes().filter((attr) => promotedAttributeNames.includes(attr.name));
        const result: Record<string, string> = {};

        for (const promotedAttribute of filteredPromotedAttributes) {
            const [ type, name ] = promotedAttribute.name.split(":", 2);
            const definition = promotedAttribute.getDefinition();

            if (definition.multiplicity !== "single") {
                // TODO: Add support for multiple definitions.
                continue;
            }

            let value: string | undefined | null = null;

            if (type === "label" && note.hasLabel(name)) {
                value = note.getLabelValue(name);
            } else if (type === "relation" && note.hasRelation(name)) {
                const targetNote = await note.getRelationTarget(name);
                value = targetNote?.title;
            }

            const friendlyName = definition.promotedAlias ?? name;
            if (friendlyName && value) {
                result[friendlyName] = value;
            }
        }

        return result;
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
                        console.log("Parse custom title for ", targetNote.noteId, targetNote.getAttributes(), targetNote.getOwnedAttributes());
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
