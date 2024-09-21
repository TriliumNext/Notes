import { t } from "../../services/i18n.js";
import libraryLoader from "../../services/library_loader.js";
import utils from "../../services/utils.js";
import dateNoteService from "../../services/date_notes.js";
import server from "../../services/server.js";
import appContext from "../../components/app_context.js";
import RightDropdownButtonWidget from "./right_dropdown_button.js";
import toastService from "../../services/toast.js";
import options from "../../services/options.js";

const MONTHS = [
    t("calendar.january"),
    t("calendar.febuary"),
    t("calendar.march"),
    t("calendar.april"),
    t("calendar.may"),
    t("calendar.june"),
    t("calendar.july"),
    t("calendar.august"),
    t("calendar.september"),
    t("calendar.october"),
    t("calendar.november"),
    t("calendar.december")
];

const DROPDOWN_TPL = `
<div class="calendar-dropdown-widget">
    <style>
        .calendar-dropdown-widget {
            width: 350px;
        }
    </style>

    <div class="calendar-header">
        <div class="calendar-month-selector">
            <button class="calendar-btn bx bx-left-arrow-alt" data-calendar-toggle="previous"></button>

            <select data-calendar-input="month">
                ${Object.entries(MONTHS).map(([i, month]) => `<option value=${i}>${month}</option>`)}
            </select>

            <button class="calendar-btn bx bx-right-arrow-alt" data-calendar-toggle="next"></button>
        </div>

        <div class="calendar-year-selector">
            <button class="calendar-btn bx bx-left-arrow-alt" data-calendar-toggle="previousYear"></button>

            <input type="number" min="1900" max="2999" step="1" data-calendar-input="year" />

            <button class="calendar-btn bx bx-right-arrow-alt" data-calendar-toggle="nextYear"></button>
        </div>
    </div>

    <div class="calendar-week">
    </div>

    <div class="calendar-body" data-calendar-area="month"></div>
</div>`;

const DAYS_OF_WEEK = [
    t("calendar.sun"),
    t("calendar.mon"),
    t("calendar.tue"),
    t("calendar.wed"),
    t("calendar.thu"),
    t("calendar.fri"),
    t("calendar.sat")
];

export default class CalendarWidget extends RightDropdownButtonWidget {
    constructor(title, icon) {
        super(title, icon, DROPDOWN_TPL);
    }

    doRender() {
        super.doRender();

        this.$month = this.$dropdownContent.find('[data-calendar-area="month"]');
        this.$weekHeader = this.$dropdownContent.find(".calendar-week");

        this.manageFirstDayOfWeek();

        // Month navigation
        this.$monthSelect = this.$dropdownContent.find('[data-calendar-input="month"]');
        this.$monthSelect.on("input", (e) => {
            this.date.setMonth(e.target.value);
            this.createMonth();
        });
        this.$next = this.$dropdownContent.find('[data-calendar-toggle="next"]');
        this.$next.on('click', () => {
            this.date.setMonth(this.date.getMonth() + 1);
            this.createMonth();
        });
        this.$previous = this.$dropdownContent.find('[data-calendar-toggle="previous"]');
        this.$previous.on('click', e => {
            this.date.setMonth(this.date.getMonth() - 1);
            this.createMonth();
        });

        // Year navigation
        this.$yearSelect = this.$dropdownContent.find('[data-calendar-input="year"]');
        this.$yearSelect.on("input", (e) => {
            this.date.setFullYear(e.target.value);
            this.createMonth();
        });
        this.$nextYear = this.$dropdownContent.find('[data-calendar-toggle="nextYear"]');
        this.$nextYear.on('click', () => {
            this.date.setFullYear(this.date.getFullYear() + 1);
            this.createMonth();
        });
        this.$previousYear = this.$dropdownContent.find('[data-calendar-toggle="previousYear"]');
        this.$previousYear.on('click', e => {
            this.date.setFullYear(this.date.getFullYear() - 1);
            this.createMonth();
        });

        this.$dropdownContent.find('.calendar-header').on("click", e => e.stopPropagation());

        this.$dropdownContent.on('click', '.calendar-date', async ev => {
            const date = $(ev.target).closest('.calendar-date').attr('data-calendar-date');

            const note = await dateNoteService.getDayNote(date);

            if (note) {
                appContext.tabManager.getActiveContext().setNote(note.noteId);
                this.dropdown.hide();
            }
            else {
                toastService.showError(t("calendar.cannot_find_day_note"));
            }

            ev.stopPropagation();
        });  
        
        // Prevent dismissing the calendar popup by clicking on an empty space inside it.
        this.$dropdownContent.on("click", (e) => e.stopPropagation());
    }

    manageFirstDayOfWeek() {
        this.firstDayOfWeek = options.getInt("firstDayOfWeek");

        // Generate the list of days of the week taking into consideration the user's selected first day of week.
        let localeDaysOfWeek = [...DAYS_OF_WEEK];
        const daysToBeAddedAtEnd = localeDaysOfWeek.splice(0, this.firstDayOfWeek);
        localeDaysOfWeek = [...localeDaysOfWeek, ...daysToBeAddedAtEnd];
        this.$weekHeader.html(localeDaysOfWeek.map((el) => `<span>${el}</span>`));
    }

    async dropdownShown() {
        await libraryLoader.requireLibrary(libraryLoader.CALENDAR_WIDGET);

        const activeNote = appContext.tabManager.getActiveContextNote();

        this.init(activeNote?.getOwnedLabelValue("dateNote"));
    }

    init(activeDate) {
        // attaching time fixes local timezone handling
        this.activeDate = activeDate ? new Date(`${activeDate}T12:00:00`) : null;
        this.todaysDate = new Date();
        this.date = new Date((this.activeDate || this.todaysDate).getTime());
        this.date.setDate(1);

        this.createMonth();
    }

    createDay(dateNotesForMonth, num, day) {
        const $newDay = $('<a>')
            .addClass("calendar-date")
            .attr('data-calendar-date', utils.formatDateISO(this.date));
        const $date = $('<span>').html(num);

        // if it's the first day of the month
        if (num === 1) {
            // 0  1  2  3  4  5  6
            // Su Mo Tu We Th Fr Sa
            // 1  2  3  4  5  6  0
            // Mo Tu We Th Fr Sa Su
            let dayOffset = day - this.firstDayOfWeek;
            if (dayOffset < 0)
                dayOffset = 7 + dayOffset;
            $newDay.css("marginLeft", (dayOffset * 14.28) + '%');
        }

        const dateNoteId = dateNotesForMonth[utils.formatDateISO(this.date)];

        if (dateNoteId) {
            $newDay.addClass('calendar-date-exists');
            $newDay.attr("data-href", `#root/${dateNoteId}`);
        }

        if (this.isEqual(this.date, this.activeDate)) {
            $newDay.addClass('calendar-date-active');
        }

        if (this.isEqual(this.date, this.todaysDate)) {
            $newDay.addClass('calendar-date-today');
        }

        $newDay.append($date);
        return $newDay;
    }

    isEqual(a, b) {
        if (!a && b || a && !b) {
            return false;
        }

        return a.getFullYear() === b.getFullYear()
            && a.getMonth() === b.getMonth()
            && a.getDate() === b.getDate();
    }

    async createMonth() {
        const month = utils.formatDateISO(this.date).substr(0, 7);
        const dateNotesForMonth = await server.get(`special-notes/notes-for-month/${month}`);

        this.$month.empty();

        const currentMonth = this.date.getMonth();
        while (this.date.getMonth() === currentMonth) {
            const $day = this.createDay(
                dateNotesForMonth,
                this.date.getDate(),
                this.date.getDay(),
                this.date.getFullYear()
            );

            this.$month.append($day);

            this.date.setDate(this.date.getDate() + 1);
        }
        // while loop trips over and day is at 30/31, bring it back
        this.date.setDate(1);
        this.date.setMonth(this.date.getMonth() - 1);

        this.$monthSelect.val(this.date.getMonth());
        this.$yearSelect.val(this.date.getFullYear());
    }

    async entitiesReloadedEvent({ loadResults }) {
        if (!loadResults.getOptionNames().includes("firstDayOfWeek")) {
            return;
        }

        this.manageFirstDayOfWeek();
        this.createMonth();
    }

}
