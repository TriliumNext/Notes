import server from "./server.js";
import appContext from "../components/app_context.js";
import utils from "./utils.js";
import noteCreateService from "./note_create.js";
import froca from "./froca.js";
import { t } from "./i18n.js";

// this key needs to have this value, so it's hit by the tooltip
const SELECTED_NOTE_PATH_KEY = "data-note-path";

const SELECTED_EXTERNAL_LINK_KEY = "data-external-link";

export interface Suggestion {
    noteTitle?: string;
    externalLink?: string;
    notePathTitle?: string;
    notePath?: string;
    highlightedNotePathTitle?: string;
    action?: string | "create-note" | "search-notes" | "external-link";
    parentNoteId?: string;
}

interface Options {
    container?: HTMLElement;
    fastSearch?: boolean;
    allowCreatingNotes?: boolean;
    allowJumpToSearchNotes?: boolean;
    allowExternalLinks?: boolean;
    hideGoToSelectedNoteButton?: boolean;
}

async function autocompleteSourceForCKEditor(queryText: string) {
    return await new Promise<MentionItem[]>((res, rej) => {
        autocompleteSource(
            queryText,
            (rows) => {
                res(
                    rows.map((row) => {
                        return {
                            action: row.action,
                            noteTitle: row.noteTitle,
                            id: `@${row.notePathTitle}`,
                            name: row.notePathTitle || "",
                            link: `#${row.notePath}`,
                            notePath: row.notePath,
                            highlightedNotePathTitle: row.highlightedNotePathTitle
                        };
                    })
                );
            },
            {
                allowCreatingNotes: true
            }
        );
    });
}

async function autocompleteSource(term: string, cb: (rows: Suggestion[]) => void, options: Options = {}) {
    const fastSearch = options.fastSearch === false ? false : true;
    if (fastSearch === false) {
        if (term.trim().length === 0) {
            return;
        }
        cb([
            {
                noteTitle: term,
                highlightedNotePathTitle: t("quick-search.searching")
            }
        ]);
    }

    const activeNoteId = appContext.tabManager.getActiveContextNoteId();

    let results: Suggestion[] = await server.get<Suggestion[]>(`autocomplete?query=${encodeURIComponent(term)}&activeNoteId=${activeNoteId}&fastSearch=${fastSearch}`);
    if (term.trim().length >= 1 && options.allowCreatingNotes) {
        results = [
            {
                action: "create-note",
                noteTitle: term,
                parentNoteId: activeNoteId || "root",
                highlightedNotePathTitle: t("note_autocomplete.create-note", { term })
            } as Suggestion
        ].concat(results);
    }

    if (term.trim().length >= 1 && options.allowJumpToSearchNotes) {
        results = results.concat([
            {
                action: "search-notes",
                noteTitle: term,
                highlightedNotePathTitle: `${t("note_autocomplete.search-for", { term })} <kbd style='color: var(--muted-text-color); background-color: transparent; float: right;'>Ctrl+Enter</kbd>`
            }
        ]);
    }

    if (term.match(/^[a-z]+:\/\/.+/i) && options.allowExternalLinks) {
        results = [
            {
                action: "external-link",
                externalLink: term,
                highlightedNotePathTitle: t("note_autocomplete.insert-external-link", { term })
            } as Suggestion
        ].concat(results);
    }

    cb(results);
}

function clearText($el: JQuery<HTMLElement>) {
    $el.setSelectedNotePath("");
    $el.autocomplete("val", "").trigger("change");
}

function setText($el: JQuery<HTMLElement>, text: string) {
    $el.setSelectedNotePath("");
    $el.autocomplete("val", text.trim()).autocomplete("open");
}

function showRecentNotes($el: JQuery<HTMLElement>) {
    $el.setSelectedNotePath("");
    $el.autocomplete("val", "");
    $el.autocomplete("open");
    $el.trigger("focus");
}

function fullTextSearch($el: JQuery<HTMLElement>, options: Options) {
    const searchString = $el.autocomplete("val") as unknown as string;
    if (options.fastSearch === false || searchString?.trim().length === 0) {
        return;
    }
    $el.trigger("focus");
    options.fastSearch = false;
    $el.autocomplete("val", "");
    $el.setSelectedNotePath("");
    $el.autocomplete("val", searchString);
    // Set a delay to avoid resetting to true before full text search (await server.get) is called.
    setTimeout(() => {
        options.fastSearch = true;
    }, 100);
}

function initNoteAutocomplete($el: JQuery<HTMLElement>, options?: Options) {
    if ($el.hasClass("note-autocomplete-input")) {
        // clear any event listener added in previous invocation of this function
        $el.off("autocomplete:noteselected");

        return $el;
    }

    options = options || {};

    $el.addClass("note-autocomplete-input");

    const $clearTextButton = $("<button>").addClass("input-group-text input-clearer-button bx bxs-tag-x").prop("title", t("note_autocomplete.clear-text-field"));

    const $showRecentNotesButton = $("<button>").addClass("input-group-text show-recent-notes-button bx bx-time").prop("title", t("note_autocomplete.show-recent-notes"));

    const $fullTextSearchButton = $("<button>")
        .addClass("input-group-text full-text-search-button bx bx-search")
        .prop("title", `${t("note_autocomplete.full-text-search")} (Shift+Enter)`);

    const $goToSelectedNoteButton = $("<a>").addClass("input-group-text go-to-selected-note-button bx bx-arrow-to-right");

    $el.after($clearTextButton).after($showRecentNotesButton).after($fullTextSearchButton);

    if (!options.hideGoToSelectedNoteButton) {
        $el.after($goToSelectedNoteButton);
    }

    $clearTextButton.on("click", () => clearText($el));

    $showRecentNotesButton.on("click", (e) => {
        showRecentNotes($el);

        // this will cause the click not give focus to the "show recent notes" button
        // this is important because otherwise input will lose focus immediately and not show the results
        return false;
    });

    $fullTextSearchButton.on("click", (e) => {
        fullTextSearch($el, options);
        return false;
    });

    let autocompleteOptions: AutoCompleteConfig = {};
    if (options.container) {
        autocompleteOptions.dropdownMenuContainer = options.container;
        autocompleteOptions.debug = true; // don't close on blur
    }

    if (options.allowJumpToSearchNotes) {
        $el.on("keydown", (event) => {
            if (event.ctrlKey && event.key === "Enter") {
                // Prevent Ctrl + Enter from triggering autoComplete.
                event.stopImmediatePropagation();
                event.preventDefault();
                $el.trigger("autocomplete:selected", { action: "search-notes", noteTitle: $el.autocomplete("val") });
            }
        });
    }
    $el.on("keydown", async (event) => {
        if (event.shiftKey && event.key === "Enter") {
            // Prevent Enter from triggering autoComplete.
            event.stopImmediatePropagation();
            event.preventDefault();
            fullTextSearch($el, options);
        }
    });

    $el.autocomplete(
        {
            ...autocompleteOptions,
            appendTo: document.querySelector("body"),
            hint: false,
            autoselect: true,
            // openOnFocus has to be false, otherwise re-focus (after return from note type chooser dialog) forces
            // re-querying of the autocomplete source which then changes the currently selected suggestion
            openOnFocus: false,
            minLength: 0,
            tabAutocomplete: false
        },
        [
            {
                source: (term, cb) => autocompleteSource(term, cb, options),
                displayKey: "notePathTitle",
                templates: {
                    suggestion: (suggestion) => suggestion.highlightedNotePathTitle
                },
                // we can't cache identical searches because notes can be created / renamed, new recent notes can be added
                cache: false
            }
        ]
    );

    // TODO: Types fail due to "autocomplete:selected" not being registered in type definitions.
    ($el as any).on("autocomplete:selected", async (event: Event, suggestion: Suggestion) => {
        if (suggestion.action === "external-link") {
            $el.setSelectedNotePath(null);
            $el.setSelectedExternalLink(suggestion.externalLink);

            $el.autocomplete("val", suggestion.externalLink);

            $el.autocomplete("close");

            $el.trigger("autocomplete:externallinkselected", [suggestion]);

            return;
        }

        if (suggestion.action === "create-note") {
            const { success, noteType, templateNoteId } = await noteCreateService.chooseNoteType();

            if (!success) {
                return;
            }

            const { note } = await noteCreateService.createNote(suggestion.parentNoteId, {
                title: suggestion.noteTitle,
                activate: false,
                type: noteType,
                templateNoteId: templateNoteId
            });

            const hoistedNoteId = appContext.tabManager.getActiveContext()?.hoistedNoteId;
            suggestion.notePath = note?.getBestNotePathString(hoistedNoteId);
        }

        if (suggestion.action === "search-notes") {
            const searchString = suggestion.noteTitle;
            appContext.triggerCommand("searchNotes", { searchString });
            return;
        }

        $el.setSelectedNotePath(suggestion.notePath);
        $el.setSelectedExternalLink(null);

        $el.autocomplete("val", suggestion.noteTitle);

        $el.autocomplete("close");

        $el.trigger("autocomplete:noteselected", [suggestion]);
    });

    $el.on("autocomplete:closed", () => {
        if (!String($el.val())?.trim()) {
            clearText($el);
        }
    });

    $el.on("autocomplete:opened", () => {
        if ($el.attr("readonly")) {
            $el.autocomplete("close");
        }
    });

    // clear any event listener added in previous invocation of this function
    $el.off("autocomplete:noteselected");

    return $el;
}

function init() {
    $.fn.getSelectedNotePath = function () {
        if (!String($(this).val())?.trim()) {
            return "";
        } else {
            return $(this).attr(SELECTED_NOTE_PATH_KEY);
        }
    };

    $.fn.getSelectedNoteId = function () {
        const $el = $(this as unknown as HTMLElement);
        const notePath = $el.getSelectedNotePath();
        if (!notePath) {
            return null;
        }

        const chunks = notePath.split("/");

        return chunks.length >= 1 ? chunks[chunks.length - 1] : null;
    };

    $.fn.setSelectedNotePath = function (notePath) {
        notePath = notePath || "";

        $(this).attr(SELECTED_NOTE_PATH_KEY, notePath);

        $(this).closest(".input-group").find(".go-to-selected-note-button").toggleClass("disabled", !notePath.trim()).attr("href", `#${notePath}`); // we also set href here so tooltip can be displayed
    };

    $.fn.getSelectedExternalLink = function () {
        if (!String($(this).val())?.trim()) {
            return "";
        } else {
            return $(this).attr(SELECTED_EXTERNAL_LINK_KEY);
        }
    };

    $.fn.setSelectedExternalLink = function (externalLink) {
        if (externalLink) {
            // TODO: This doesn't seem to do anything with the external link, is it normal?
            $(this).closest(".input-group").find(".go-to-selected-note-button").toggleClass("disabled", true);
        }
    };

    $.fn.setNote = async function (noteId) {
        const note = noteId ? await froca.getNote(noteId, true) : null;

        $(this)
            .val(note ? note.title : "")
            .setSelectedNotePath(noteId);
    };
}

export default {
    autocompleteSourceForCKEditor,
    initNoteAutocomplete,
    showRecentNotes,
    setText,
    init
};
