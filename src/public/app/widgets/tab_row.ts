import Draggabilly, { type MoveVector } from "draggabilly";
import { t } from "../services/i18n.js";
import BasicWidget from "./basic_widget.js";
import contextMenu from "../menus/context_menu.js";
import utils from "../services/utils.js";
import keyboardActionService from "../services/keyboard_actions.js";
import appContext, { type CommandNames, type CommandListenerData, type EventData } from "../components/app_context.js";
import froca from "../services/froca.js";
import attributeService from "../services/attributes.js";
import type NoteContext from "../components/note_context.js";

const isDesktop = utils.isDesktop();

const TAB_CONTAINER_MIN_WIDTH = 24;
const TAB_CONTAINER_MAX_WIDTH = 240;
const TAB_CONTAINER_LEFT_PADDING = 5;
const NEW_TAB_WIDTH = 32;
const MIN_FILLER_WIDTH = isDesktop ? 50 : 15;
const MARGIN_WIDTH = 5;

const TAB_SIZE_SMALL = 84;
const TAB_SIZE_SMALLER = 60;
const TAB_SIZE_MINI = 48;

const TAB_TPL = `
<div class="note-tab">
  <div class="note-tab-wrapper">
    <div class="note-tab-drag-handle"></div>
    <div class="note-tab-icon"></div>
    <div class="note-tab-title"></div>
    <div class="note-tab-close bx bx-x" title="${t("tab_row.close_tab")}"></div>
  </div>
</div>`;

const NEW_TAB_BUTTON_TPL = `<div class="note-new-tab" data-trigger-command="openNewTab" title="${t("tab_row.add_new_tab")}">+</div>`;
const FILLER_TPL = `<div class="tab-row-filler"></div>`;

const TAB_ROW_TPL = `
<div class="tab-row-widget">
    <style>
    .tab-row-widget {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        background: var(--main-background-color);
        overflow: hidden;
        user-select: none;
    }

    .tab-row-widget.full-width {
        background: var(--launcher-pane-background-color);
    }

    .tab-row-widget * {
        box-sizing: inherit;
        font: inherit;
    }

    .tab-row-widget .tab-row-widget-container {
        box-sizing: border-box;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .tab-row-widget .note-tab {
        position: absolute;
        left: 0;
        width: 240px;
        border: 0;
        margin: 0;
        z-index: 1;
        pointer-events: none;
    }

    .note-new-tab {
        position: absolute;
        left: 0;
        width: 36px;
        height: 36px;
        padding: 1px;
        border: 0;
        margin: 0;
        z-index: 1;
        text-align: center;
        font-size: 24px;
        cursor: pointer;
        box-sizing: border-box;
    }

    .note-new-tab:hover {
        background-color: var(--accented-background-color);
        border-radius: var(--button-border-radius);
    }

    .tab-row-filler {
        box-sizing: border-box;
        -webkit-app-region: drag;
        position: absolute;
        left: 0;
        height: 100%;
    }

    body.mobile .tab-row-filler {
        display: none;
    }

    .tab-row-widget .note-tab[active] {
        z-index: 5;
    }

    .tab-row-widget .note-tab,
    .tab-row-widget .note-tab * {
        cursor: default;
    }

    .tab-row-widget .note-tab.note-tab-was-just-added {
        top: 10px;
        animation: note-tab-was-just-added 120ms forwards ease-in-out;
    }

    .tab-row-widget .note-tab .note-tab-wrapper {
        position: absolute;
        display: flex;
        align-items: center;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        height: 36px;
        padding: 7px 5px 7px 11px;
        border-radius: 8px;
        overflow: hidden;
        pointer-events: all;
        color: var(--inactive-tab-text-color);
        --tab-background-color: var(--workspace-tab-background-color);
        background-color: var(--tab-background-color, var(--inactive-tab-background-color));
    }

    .tab-row-widget .note-tab[active] .note-tab-wrapper {
        font-weight: bold;
        color: var(--active-tab-text-color);
        background-color : var(--tab-background-color, var(--active-tab-background-color));
    }

    .tab-row-widget .note-tab[is-mini] .note-tab-wrapper {
        padding-left: 2px;
        padding-right: 2px;
    }

    .tab-row-widget .note-tab .note-tab-title {
        flex: 1;
        vertical-align: top;
        overflow: hidden;
        white-space: nowrap;
    }

    .tab-row-widget .note-tab .note-tab-icon {
        position: relative;
        top: -1px;
        padding-right: 3px;
    }

    .tab-row-widget .note-tab[is-small] .note-tab-title {
        margin-left: 0;
    }

    .tab-row-widget .note-tab .note-tab-drag-handle {
        position: absolute;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        z-index: 50;
    }

    .tab-row-widget .note-tab .note-tab-close {
        flex: 0 0 22px;
        border-radius: 50%;
        z-index: 100;
        width: 22px;
        height: 22px;
        cursor: pointer;
        text-align: center;
    }

    .tab-row-widget .note-tab:hover .note-tab-wrapper {
        background-color: var(--tab-background-color, var(--inactive-tab-hover-background-color));
    }

    .tab-row-widget .note-tab[active]:hover .note-tab-wrapper {
        background-color: var(--tab-background-color, var(--active-tab-hover-background-color));
    }

    body.desktop .tab-row-widget .note-tab .note-tab-close:hover {
        background-color: var(--hover-item-background-color);
        color: var(--hover-item-text-color);
    }

    .tab-row-widget .note-tab[is-smaller] .note-tab-close {
        margin-left: auto;
    }
    .tab-row-widget .note-tab[is-mini]:not([active]) .note-tab-close {
        display: none;
    }
    .tab-row-widget .note-tab[is-mini][active] .note-tab-close {
        margin-left: auto;
        margin-right: auto;
    }
    @-moz-keyframes note-tab-was-just-added {
        to {
            top: 0;
        }
    }
    @-webkit-keyframes note-tab-was-just-added {
        to {
            top: 0;
        }
    }
    @-o-keyframes note-tab-was-just-added {
        to {
            top: 0;
        }
    }
    @keyframes note-tab-was-just-added {
        to {
            top: 0;
        }
    }
    .tab-row-widget.tab-row-widget-is-sorting .note-tab:not(.note-tab-is-dragging),
    .tab-row-widget:not(.tab-row-widget-is-sorting) .note-tab.note-tab-was-just-dragged {
        transition: transform 120ms ease-in-out;
    }
    </style>

    <div class="tab-row-widget-container"></div>
</div>`;

export default class TabRowWidget extends BasicWidget {

    private isDragging?: boolean;
    private showNoteIcons?: boolean;
    private draggabillies!: Draggabilly[];
    private draggabillyDragging?: Draggabilly | null;

    private $style!: JQuery<HTMLElement>;
    private $filler!: JQuery<HTMLElement>;
    private $newTab!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TAB_ROW_TPL);

        const documentStyle = window.getComputedStyle(document.documentElement);
        this.showNoteIcons = documentStyle.getPropertyValue("--tab-note-icons") === "true";

        this.draggabillies = [];

        this.setupStyle();
        this.setupEvents();
        this.setupDraggabilly();
        this.setupNewButton();
        this.setupFiller();
        this.layoutTabs();
        this.setVisibility();

        this.$widget.on("contextmenu", ".note-tab", (e) => {
            e.preventDefault();

            const ntxId = $(e.target).closest(".note-tab").attr("data-ntx-id");

            contextMenu.show<CommandNames>({
                x: e.pageX,
                y: e.pageY,
                items: [
                    { title: t("tab_row.close"), command: "closeTab", uiIcon: "bx bx-x" },
                    { title: t("tab_row.close_other_tabs"), command: "closeOtherTabs", uiIcon: "bx bx-empty", enabled: appContext.tabManager.noteContexts.length !== 1 },
                    { title: t("tab_row.close_right_tabs"), command: "closeRightTabs", uiIcon: "bx bx-empty", enabled: appContext.tabManager.noteContexts?.at(-1)?.ntxId !== ntxId },
                    { title: t("tab_row.close_all_tabs"), command: "closeAllTabs", uiIcon: "bx bx-empty" },

                    { title: "----" },

                    { title: t("tab_row.reopen_last_tab"), command: "reopenLastTab", uiIcon: "bx bx-undo", enabled: appContext.tabManager.recentlyClosedTabs.length !== 0 },

                    { title: "----" },

                    { title: t("tab_row.move_tab_to_new_window"), command: "moveTabToNewWindow", uiIcon: "bx bx-window-open" },
                    { title: t("tab_row.copy_tab_to_new_window"), command: "copyTabToNewWindow", uiIcon: "bx bx-empty" }
                ],
                selectMenuItemHandler: ({ command }) => {
                    if (command) {
                        this.triggerCommand(command, { ntxId });
                    }
                }
            });
        });
    }

    setupStyle() {
        this.$style = $("<style>");
        this.$widget.append(this.$style);
    }

    setupEvents() {
        new ResizeObserver((_) => {
            this.cleanUpPreviouslyDraggedTabs();
            this.layoutTabs();
        }).observe(this.$widget[0]);

        this.tabEls.forEach((tabEl) => this.setTabCloseEvent(tabEl));
    }

    setVisibility() {
        this.$widget.show();
    }

    get tabEls() {
        return Array.prototype.slice.call(this.$widget.find(".note-tab"));
    }

    get $tabContainer() {
        return this.$widget.find(".tab-row-widget-container");
    }

    get tabWidths() {
        const numberOfTabs = this.tabEls.length;
        const tabsContainerWidth = this.$tabContainer[0].clientWidth - NEW_TAB_WIDTH - MIN_FILLER_WIDTH;
        const marginWidth = (numberOfTabs - 1) * MARGIN_WIDTH;
        const targetWidth = (tabsContainerWidth - marginWidth) / numberOfTabs;
        const clampedTargetWidth = Math.max(TAB_CONTAINER_MIN_WIDTH, Math.min(TAB_CONTAINER_MAX_WIDTH, targetWidth));
        const flooredClampedTargetWidth = Math.floor(clampedTargetWidth);
        const totalTabsWidthUsingTarget = flooredClampedTargetWidth * numberOfTabs + marginWidth;
        const totalExtraWidthDueToFlooring = tabsContainerWidth - totalTabsWidthUsingTarget;

        const widths = [];
        let extraWidthRemaining = totalExtraWidthDueToFlooring;

        for (let i = 0; i < numberOfTabs; i += 1) {
            const extraWidth = flooredClampedTargetWidth < TAB_CONTAINER_MAX_WIDTH && extraWidthRemaining > 0 ? 1 : 0;

            widths.push(flooredClampedTargetWidth + extraWidth);

            if (extraWidthRemaining > 0) {
                extraWidthRemaining -= 1;
            }
        }

        if (this.$filler) {
            this.$filler.css("width", `${extraWidthRemaining + MIN_FILLER_WIDTH}px`);
        }

        return widths;
    }

    getTabPositions() {
        const tabPositions: number[] = [];

        let position = TAB_CONTAINER_LEFT_PADDING;
        this.tabWidths.forEach((width) => {
            tabPositions.push(position);
            position += width + MARGIN_WIDTH;
        });

        position -= MARGIN_WIDTH; // the last margin should not be applied

        const newTabPosition = position;
        const fillerPosition = position + 32;

        return { tabPositions, newTabPosition, fillerPosition };
    }

    layoutTabs() {
        const tabContainerWidths = this.tabWidths;

        this.tabEls.forEach((tabEl, i) => {
            const width = tabContainerWidths[i];

            tabEl.style.width = `${width}px`;
            tabEl.removeAttribute("is-small");
            tabEl.removeAttribute("is-smaller");
            tabEl.removeAttribute("is-mini");

            if (width < TAB_SIZE_SMALL) tabEl.setAttribute("is-small", "");
            if (width < TAB_SIZE_SMALLER) tabEl.setAttribute("is-smaller", "");
            if (width < TAB_SIZE_MINI) tabEl.setAttribute("is-mini", "");
        });

        let styleHTML = "";

        const { tabPositions, newTabPosition, fillerPosition } = this.getTabPositions();

        tabPositions.forEach((position, i) => {
            styleHTML += `.note-tab:nth-child(${i + 1}) { transform: translate3d(${position}px, 0, 0)} `;
        });

        styleHTML += `.note-new-tab { transform: translate3d(${newTabPosition}px, 0, 0) } `;
        styleHTML += `.tab-row-filler { transform: translate3d(${fillerPosition}px, 0, 0) } `;

        this.$style.html(styleHTML);
    }

    addTab(ntxId: string) {
        const $tab = $(TAB_TPL).attr("data-ntx-id", ntxId);

        keyboardActionService.updateDisplayedShortcuts($tab);

        $tab.addClass("note-tab-was-just-added");

        setTimeout(() => $tab.removeClass("note-tab-was-just-added"), 500);

        this.$newTab.before($tab);
        this.setVisibility();
        this.setTabCloseEvent($tab);
        this.updateTitle($tab, t("tab_row.new_tab"));
        this.cleanUpPreviouslyDraggedTabs();
        this.layoutTabs();
        this.setupDraggabilly();
    }

    closeActiveTabCommand({ $el }: CommandListenerData<"closeActiveTab">) {
        const ntxId = $el.closest(".note-tab").attr("data-ntx-id");

        appContext.tabManager.removeNoteContext(ntxId ?? null);
    }

    setTabCloseEvent($tab: JQuery<HTMLElement>) {
        $tab.on("mousedown", (e) => {
            if (e.which === 2) {
                appContext.tabManager.removeNoteContext($tab.attr("data-ntx-id") ?? null);

                return true; // event has been handled
            }
        });

        $tab.find(".note-tab-close").on("click", (e) => {
            this.triggerCommand("closeActiveTab", { $el: $(e.target) });
            return true;
        });
    }

    get activeTabEl() {
        return this.$widget.find(".note-tab[active]")[0];
    }

    activeContextChangedEvent() {
        let activeNoteContext = appContext.tabManager.getActiveContext();

        if (!activeNoteContext) {
            return;
        }

        if (activeNoteContext.mainNtxId) {
            activeNoteContext = appContext.tabManager.getNoteContextById(activeNoteContext.mainNtxId);
        }

        const tabEl = this.getTabById(activeNoteContext.ntxId)[0];
        const activeTabEl = this.activeTabEl;
        if (activeTabEl === tabEl) return;
        if (activeTabEl) activeTabEl.removeAttribute("active");
        if (tabEl) tabEl.setAttribute("active", "");
    }

    newNoteContextCreatedEvent({ noteContext }: EventData<"newNoteContextCreated">) {
        if (!noteContext.mainNtxId && noteContext.ntxId) {
            this.addTab(noteContext.ntxId);
        }
    }

    removeTab(ntxId: string) {
        const tabEl = this.getTabById(ntxId)[0];

        if (tabEl) {
            tabEl.parentNode?.removeChild(tabEl);
            this.cleanUpPreviouslyDraggedTabs();
            this.layoutTabs();
            this.setupDraggabilly();
            this.setVisibility();
        }
    }

    getNtxIdsInOrder() {
        return this.tabEls.map((el) => el.getAttribute("data-ntx-id"));
    }

    updateTitle($tab: JQuery<HTMLElement>, title: string) {
        $tab.attr("title", title);
        $tab.find(".note-tab-title").text(title);
    }

    getTabById(ntxId: string | null) {
        return this.$widget.find(`[data-ntx-id='${ntxId}']`);
    }

    getTabId($tab: JQuery<HTMLElement>) {
        return $tab.attr("data-ntx-id");
    }

    noteContextRemovedEvent({ ntxIds }: EventData<"noteContextRemoved">) {
        for (const ntxId of ntxIds) {
            this.removeTab(ntxId);
        }
    }

    cleanUpPreviouslyDraggedTabs() {
        this.tabEls.forEach((tabEl) => tabEl.classList.remove("note-tab-was-just-dragged"));
    }

    setupDraggabilly() {
        const tabEls = this.tabEls;
        const { tabPositions } = this.getTabPositions();

        if (this.isDragging && this.draggabillyDragging) {
            this.isDragging = false;
            this.$widget.removeClass("tab-row-widget-is-sorting");
            // TODO: Some of these don't make sense, might need removal.
            this.draggabillyDragging.element.classList.remove("note-tab-is-dragging");
            this.draggabillyDragging.element.style.transform = "";
            this.draggabillyDragging.dragEnd();
            this.draggabillyDragging.isDragging = false;
            this.draggabillyDragging.positionDrag = () => { }; // Prevent Draggabilly from updating tabEl.style.transform in later frames
            this.draggabillyDragging.destroy();
            this.draggabillyDragging = null;
        }

        this.draggabillies.forEach((d) => d.destroy());

        tabEls.forEach((tabEl, originalIndex) => {
            const originalTabPositionX = tabPositions[originalIndex];
            const draggabilly = new Draggabilly(tabEl, {
                axis: "x",
                handle: ".note-tab-drag-handle",
                containment: this.$tabContainer[0]
            });

            this.draggabillies.push(draggabilly);

            draggabilly.on("pointerDown", () => {
                appContext.tabManager.activateNoteContext(tabEl.getAttribute("data-ntx-id"));
            });

            draggabilly.on("dragStart", () => {
                this.isDragging = true;
                this.draggabillyDragging = draggabilly;
                tabEl.classList.add("note-tab-is-dragging");
                this.$widget.addClass("tab-row-widget-is-sorting");
            });

            draggabilly.on("dragEnd", () => {
                this.isDragging = false;
                const finalTranslateX = parseFloat(tabEl.style.left);
                tabEl.style.transform = `translate3d(0, 0, 0)`;

                // Animate dragged tab back into its place
                requestAnimationFrame((_) => {
                    tabEl.style.left = "0";
                    tabEl.style.transform = `translate3d(${finalTranslateX}px, 0, 0)`;

                    requestAnimationFrame((_) => {
                        tabEl.classList.remove("note-tab-is-dragging");
                        this.$widget.removeClass("tab-row-widget-is-sorting");

                        tabEl.classList.add("note-tab-was-just-dragged");

                        requestAnimationFrame((_) => {
                            tabEl.style.transform = "";

                            this.layoutTabs();
                            this.setupDraggabilly();
                        });
                    });
                });
            });

            draggabilly.on("dragMove", (event: unknown, pointer: unknown, moveVector: MoveVector) => {
                // The current index be computed within the event since it can change during the dragMove
                const tabEls = this.tabEls;
                const currentIndex = tabEls.indexOf(tabEl);

                const currentTabPositionX = originalTabPositionX + moveVector.x;
                const destinationIndexTarget = this.closest(currentTabPositionX, tabPositions);
                const destinationIndex = Math.max(0, Math.min(tabEls.length, destinationIndexTarget));

                if (currentIndex !== destinationIndex) {
                    this.animateTabMove(tabEl, currentIndex, destinationIndex);
                }

                if (Math.abs(moveVector.y) > 100) {
                    this.triggerCommand("moveTabToNewWindow", { ntxId: this.getTabId($(tabEl)) });
                }
            });
        });
    }

    animateTabMove(tabEl: HTMLElement, originIndex: number, destinationIndex: number) {
        if (destinationIndex < originIndex) {
            tabEl.parentNode?.insertBefore(tabEl, this.tabEls[destinationIndex]);
        } else {
            const beforeEl = this.tabEls[destinationIndex + 1] || this.$newTab[0];

            tabEl.parentNode?.insertBefore(tabEl, beforeEl);
        }
        this.triggerEvent("tabReorder", { ntxIdsInOrder: this.getNtxIdsInOrder() });
        this.layoutTabs();
    }

    setupNewButton() {
        this.$newTab = $(NEW_TAB_BUTTON_TPL);

        this.$tabContainer.append(this.$newTab);
    }

    setupFiller() {
        this.$filler = $(FILLER_TPL);

        this.$tabContainer.append(this.$filler);
    }

    closest(value: number, array: number[]) {
        let closest = Infinity;
        let closestIndex = -1;

        array.forEach((v, i) => {
            if (Math.abs(value - v) < closest) {
                closest = Math.abs(value - v);
                closestIndex = i;
            }
        });

        return closestIndex;
    }

    noteSwitchedAndActivatedEvent({ noteContext }: EventData<"noteSwitchedAndActivated">) {
        this.activeContextChangedEvent();

        this.updateTabById(noteContext.mainNtxId || noteContext.ntxId);
    }

    noteSwitchedEvent({ noteContext }: EventData<"noteSwitched">) {
        this.updateTabById(noteContext.mainNtxId || noteContext.ntxId);
    }

    noteContextReorderEvent({ oldMainNtxId, newMainNtxId }: EventData<"noteContextReorder">) {
        if (!oldMainNtxId || !newMainNtxId) {
            // no need to update tab row
            return;
        }

        // update tab id for the new main context
        this.getTabById(oldMainNtxId).attr("data-ntx-id", newMainNtxId);
        this.updateTabById(newMainNtxId);
    }

    contextsReopenedEvent({ mainNtxId, tabPosition }: EventData<"contextsReopened">) {
        if (!mainNtxId || !tabPosition) {
            // no tab reopened
            return;
        }
        const tabEl = this.getTabById(mainNtxId)[0];
        tabEl.parentNode?.insertBefore(tabEl, this.tabEls[tabPosition]);
    }

    updateTabById(ntxId: string | null) {
        const $tab = this.getTabById(ntxId);

        const noteContext = appContext.tabManager.getNoteContextById(ntxId);

        this.updateTab($tab, noteContext);
    }

    async updateTab($tab: JQuery<HTMLElement>, noteContext: NoteContext) {
        if (!$tab.length) {
            return;
        }

        for (const clazz of Array.from($tab[0].classList)) {
            // create copy to safely iterate over while removing classes
            if (clazz !== "note-tab") {
                $tab.removeClass(clazz);
            }
        }

        let noteIcon = "";

        if (noteContext) {
            const hoistedNote = froca.getNoteFromCache(noteContext.hoistedNoteId);

            if (hoistedNote) {
                $tab.find(".note-tab-wrapper").css("--workspace-tab-background-color", hoistedNote.getWorkspaceTabBackgroundColor());
                if (!this.showNoteIcons) {
                    noteIcon = hoistedNote.getWorkspaceIconClass();
                }
            } else {
                $tab.find(".note-tab-wrapper").removeAttr("style");
            }
        }

        const { note } = noteContext;

        if (!note) {
            this.updateTitle($tab, t("tab_row.new_tab"));
            return;
        }

        const title = await noteContext.getNavigationTitle();
        if (title) {
            this.updateTitle($tab, title);
        }

        $tab.addClass(note.getCssClass());
        $tab.addClass(utils.getNoteTypeClass(note.type));
        $tab.addClass(utils.getMimeTypeClass(note.mime));

        if (this.showNoteIcons) {
            noteIcon = note.getIcon();
        }

        if (noteIcon) {
            $tab.find(".note-tab-icon").removeClass().addClass("note-tab-icon").addClass(noteIcon);
        }
    }

    async entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        for (const noteContext of appContext.tabManager.noteContexts) {
            if (!noteContext.noteId) {
                continue;
            }

            if (
                loadResults.isNoteReloaded(noteContext.noteId) ||
                loadResults
                    .getAttributeRows()
                    .find((attr) => ["workspace", "workspaceIconClass", "workspaceTabBackgroundColor"].includes(attr.name || "") && attributeService.isAffecting(attr, noteContext.note))
            ) {
                const $tab = this.getTabById(noteContext.ntxId);

                this.updateTab($tab, noteContext);
            }
        }
    }

    frocaReloadedEvent() {
        for (const noteContext of appContext.tabManager.noteContexts) {
            const $tab = this.getTabById(noteContext.ntxId);

            this.updateTab($tab, noteContext);
        }
    }

    hoistedNoteChangedEvent({ ntxId }: EventData<"hoistedNoteChanged">) {
        const $tab = this.getTabById(ntxId);

        if ($tab && ntxId) {
            const noteContext = appContext.tabManager.getNoteContextById(ntxId);

            this.updateTab($tab, noteContext);
        }
    }
}
