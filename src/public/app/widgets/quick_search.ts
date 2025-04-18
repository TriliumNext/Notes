import BasicWidget from "./basic_widget.js";
import server from "../services/server.js";
import linkService from "../services/link.js";
import froca from "../services/froca.js";
import utils from "../services/utils.js";
import appContext from "../components/app_context.js";
import shortcutService from "../services/shortcuts.js";
import { t } from "../services/i18n.js";
import { Dropdown, Tooltip } from "bootstrap";

const TPL = /*html*/`
<div class="quick-search input-group input-group-sm">
  <style>
    .quick-search {
        padding: 10px 10px 10px 0px;
        height: 50px;
    }

    .quick-search button, .quick-search input {
        border: 0;
        font-size: 100% !important;
    }

    .quick-search .dropdown-menu {
        max-height: 600px;
        max-width: 400px;
        overflow-y: auto;
        overflow-x: hidden;
        text-overflow: ellipsis;
        box-shadow: -30px 50px 93px -50px black;
    }
  </style>

  <div class="input-group-prepend">
    <button class="btn btn-outline-secondary search-button" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span class="bx bx-search"></span>
    </button>
    <div class="dropdown-menu tn-dropdown-list"></div>
  </div>
  <input type="text" class="form-control form-control-sm search-string" placeholder="${t("quick-search.placeholder")}">
</div>`;

const MAX_DISPLAYED_NOTES = 15;

// TODO: Deduplicate with server.
interface QuickSearchResponse {
    searchResultNoteIds: string[];
    error: string;
}

export default class QuickSearchWidget extends BasicWidget {

    private dropdown!: bootstrap.Dropdown;
    private $searchString!: JQuery<HTMLElement>;
    private $dropdownMenu!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$searchString = this.$widget.find(".search-string");
        this.$dropdownMenu = this.$widget.find(".dropdown-menu");

        this.dropdown = Dropdown.getOrCreateInstance(this.$widget.find("[data-bs-toggle='dropdown']")[0], {
            reference: this.$searchString[0],
            popperConfig: {
                strategy: "fixed",
                placement: "bottom"
            }
        });

        this.$widget.find(".input-group-prepend").on("shown.bs.dropdown", () => this.search());

        if (utils.isMobile()) {
            this.$searchString.keydown((e) => {
                if (e.which === 13) {
                    if (this.$dropdownMenu.is(":visible")) {
                        this.search(); // just update already visible dropdown
                    } else {
                        this.dropdown.show();
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }

        shortcutService.bindElShortcut(this.$searchString, "return", () => {
            if (this.$dropdownMenu.is(":visible")) {
                this.search(); // just update already visible dropdown
            } else {
                this.dropdown.show();
            }

            this.$searchString.focus();
        });

        shortcutService.bindElShortcut(this.$searchString, "down", () => {
            this.$dropdownMenu.find(".dropdown-item:not(.disabled):first").focus();
        });

        shortcutService.bindElShortcut(this.$searchString, "esc", () => {
            this.dropdown.hide();
        });

        return this.$widget;
    }

    async search() {
        const searchString = String(this.$searchString.val())?.trim();

        if (!searchString) {
            this.dropdown.hide();
            return;
        }

        this.$dropdownMenu.empty();
        this.$dropdownMenu.append(`<span class="dropdown-item disabled"><span class="bx bx-loader bx-spin"></span>${t("quick-search.searching")}</span>`);

        const { searchResultNoteIds, error } = await server.get<QuickSearchResponse>(`quick-search/${encodeURIComponent(searchString)}`);

        if (error) {
            let tooltip = new Tooltip(this.$searchString[0], {
                trigger: "manual",
                title: `Search error: ${error}`,
                placement: "right"
            });

            tooltip.show();

            setTimeout(() => tooltip.dispose(), 4000);
        }

        const displayedNoteIds = searchResultNoteIds.slice(0, Math.min(MAX_DISPLAYED_NOTES, searchResultNoteIds.length));

        this.$dropdownMenu.empty();

        if (displayedNoteIds.length === 0) {
            this.$dropdownMenu.append(`<span class="dropdown-item disabled">${t("quick-search.no-results")}</span>`);
        }

        for (const note of await froca.getNotes(displayedNoteIds)) {
            const $link = await linkService.createLink(note.noteId, { showNotePath: true, showNoteIcon: true });
            $link.addClass("dropdown-item");
            $link.attr("tabIndex", "0");
            $link.on("click", (e) => {
                this.dropdown.hide();

                if (!e.target || e.target.nodeName !== "A") {
                    // click on the link is handled by link handling, but we want the whole item clickable
                    const activeContext = appContext.tabManager.getActiveContext();
                    if (activeContext) {
                        activeContext.setNote(note.noteId);
                    }
                }
            });
            shortcutService.bindElShortcut($link, "return", () => {
                this.dropdown.hide();

                const activeContext = appContext.tabManager.getActiveContext();
                if (activeContext) {
                    activeContext.setNote(note.noteId);
                }
            });

            this.$dropdownMenu.append($link);
        }

        if (searchResultNoteIds.length > MAX_DISPLAYED_NOTES) {
            const numRemainingResults = searchResultNoteIds.length - MAX_DISPLAYED_NOTES;
            this.$dropdownMenu.append(`<span class="dropdown-item disabled">${t("quick-search.more-results", { number: numRemainingResults })}</span>`);
        }

        const $showInFullButton = $('<a class="dropdown-item" tabindex="0">').text(t("quick-search.show-in-full-search"));

        this.$dropdownMenu.append($(`<div class="dropdown-divider">`));
        this.$dropdownMenu.append($showInFullButton);

        $showInFullButton.on("click", () => this.showInFullSearch());

        shortcutService.bindElShortcut($showInFullButton, "return", () => this.showInFullSearch());

        shortcutService.bindElShortcut(this.$dropdownMenu.find(".dropdown-item:first"), "up", () => this.$searchString.focus());

        this.dropdown.update();
    }

    async showInFullSearch() {
        this.dropdown.hide();

        await appContext.triggerCommand("searchNotes", {
            searchString: String(this.$searchString.val())
        });
    }

    quickSearchEvent() {
        this.$searchString.focus();
    }
}
