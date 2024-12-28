import { CommandNames } from '../components/app_context.js';
import keyboardActionService from '../services/keyboard_actions.js';
import utils from '../services/utils.js';

interface ContextMenuOptions<T extends CommandNames> {
    x: number;
    y: number;
    orientation?: "left";
    selectMenuItemHandler: MenuHandler<T>;
    items: MenuItem<T>[];
}

interface MenuSeparatorItem {
    title: "----"
}

export interface MenuCommandItem<T extends CommandNames> {
    title: string;
    command?: T;
    type?: string;
    uiIcon?: string;
    templateNoteId?: string;
    enabled?: boolean;
    handler?: MenuHandler<T>;
    items?: MenuItem<T>[] | null;
    shortcut?: string;
    spellingSuggestion?: string;
}

export type MenuItem<T extends CommandNames> = MenuCommandItem<T> | MenuSeparatorItem;
export type MenuHandler<T extends CommandNames> = (item: MenuCommandItem<T>, e: JQuery.MouseDownEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => void;

class ContextMenu {

    private $widget: JQuery<HTMLElement>;
    private $cover: JQuery<HTMLElement>;
    private dateContextMenuOpenedMs: number;
    private options?: ContextMenuOptions<any>;
    private isMobile: boolean;

    constructor() {
        this.$widget = $("#context-menu-container");
        this.$cover = $("#context-menu-cover");
        this.$widget.addClass("dropend");
        this.dateContextMenuOpenedMs = 0;
        this.isMobile = utils.isMobile();

        if (this.isMobile) {
            this.$cover.on("click", () => this.hide());
        } else {
            $(document).on('click', (e) => this.hide());
        }
    }

    async show<T extends CommandNames>(options: ContextMenuOptions<T>) {
        this.options = options;

        if (this.$widget.hasClass("show")) {
            // The menu is already visible. Hide the menu then open it again
            // at the new location to re-trigger the opening animation.
            await this.hide();
        }

        this.$cover.addClass("show");
        $("body").addClass("context-menu-shown");

        this.$widget.empty();

        this.addItems(this.$widget, options.items);

        keyboardActionService.updateDisplayedShortcuts(this.$widget);

        this.positionMenu();

        this.dateContextMenuOpenedMs = Date.now();
    }

    positionMenu() {
        if (!this.options) {
            return;
        }

        // the code below tries to detect when dropdown would overflow from page
        // in such case we'll position it above click coordinates, so it will fit into the client

        const CONTEXT_MENU_PADDING = 5; // How many pixels to pad the context menu from edge of screen
        const CONTEXT_MENU_OFFSET = 0; // How many pixels to offset the context menu by relative to cursor, see #3157

        const clientHeight = document.documentElement.clientHeight;
        const clientWidth = document.documentElement.clientWidth;
        const contextMenuHeight = this.$widget.outerHeight();
        const contextMenuWidth = this.$widget.outerWidth();
        let top, left;

        if (contextMenuHeight && this.options.y + contextMenuHeight - CONTEXT_MENU_OFFSET > clientHeight - CONTEXT_MENU_PADDING) {
            // Overflow: bottom
            top = clientHeight - contextMenuHeight - CONTEXT_MENU_PADDING;
        } else if (this.options.y - CONTEXT_MENU_OFFSET < CONTEXT_MENU_PADDING) {
            // Overflow: top
            top = CONTEXT_MENU_PADDING;
        } else {
            top = this.options.y - CONTEXT_MENU_OFFSET;
        }

        if (this.options.orientation === 'left' && contextMenuWidth) {
            if (this.options.x + CONTEXT_MENU_OFFSET > clientWidth - CONTEXT_MENU_PADDING) {
                // Overflow: right
                left = clientWidth - contextMenuWidth - CONTEXT_MENU_OFFSET;
            } else if (this.options.x - contextMenuWidth + CONTEXT_MENU_OFFSET < CONTEXT_MENU_PADDING) {
                // Overflow: left
                left = CONTEXT_MENU_PADDING;
            } else {
                left = this.options.x - contextMenuWidth + CONTEXT_MENU_OFFSET;
            }
        } else {
            if (contextMenuWidth && this.options.x + contextMenuWidth - CONTEXT_MENU_OFFSET > clientWidth - CONTEXT_MENU_PADDING) {
                // Overflow: right
                left = clientWidth - contextMenuWidth - CONTEXT_MENU_PADDING;
            } else if (this.options.x - CONTEXT_MENU_OFFSET < CONTEXT_MENU_PADDING) {
                // Overflow: left
                left = CONTEXT_MENU_PADDING;
            } else {
                left = this.options.x - CONTEXT_MENU_OFFSET;
            }
        }

        this.$widget.css({
            display: "block",
            top: top,
            left: left
        }).addClass("show");
    }

    addItems($parent: JQuery<HTMLElement>, items: MenuItem<any>[]) {
        for (const item of items) {
            if (!item) {
                continue;
            }

            if (item.title === '----') {
                $parent.append($("<div>").addClass("dropdown-divider"));
            } else {
                const $icon = $("<span>");

                if ("uiIcon" in item && item.uiIcon) {
                    $icon.addClass(item.uiIcon);
                } else {
                    $icon.append("&nbsp;");
                }

                const $link = $("<span>")
                    .append($icon)
                    .append(" &nbsp; ") // some space between icon and text
                    .append(item.title);

                if ("shortcut" in item && item.shortcut) {
                    $link.append($("<kbd>").text(item.shortcut));
                }

                const $item = $("<li>")
                    .addClass("dropdown-item")
                    .append($link)
                    .on('contextmenu', e => false)
                    // important to use mousedown instead of click since the former does not change focus
                    // (especially important for focused text for spell check)
                    .on('mousedown', e => {
                        e.stopPropagation();

                        if (e.which !== 1) { // only left click triggers menu items
                            return false;
                        }

                        if (this.isMobile && "items" in item && item.items) {
                            const $item = $(e.target)
                                .closest(".dropdown-item");

                            $item.toggleClass("submenu-open");
                            $item.find("ul.dropdown-menu")
                                .toggleClass("show");
                            return false;
                        }

                        this.hide();

                        if ("handler" in item && item.handler) {
                            item.handler(item, e);
                        }

                        this.options?.selectMenuItemHandler(item, e);

                        // it's important to stop the propagation especially for sub-menus, otherwise the event
                        // might be handled again by top-level menu
                        return false;
                    });

                if ("enabled" in item && item.enabled !== undefined && !item.enabled) {
                    $item.addClass("disabled");
                }

                if ("items" in item && item.items) {
                    $item.addClass("dropdown-submenu");
                    $link.addClass("dropdown-toggle");

                    const $subMenu = $("<ul>").addClass("dropdown-menu");

                    this.addItems($subMenu, item.items);

                    $item.append($subMenu);
                }

                $parent.append($item);
            }
        }
    }

    async hide() {
        // this date checking comes from change in FF66 - https://github.com/zadam/trilium/issues/468
        // "contextmenu" event also triggers "click" event which depending on the timing can close the just opened context menu
        // we might filter out right clicks, but then it's better if even right clicks close the context menu
        if (Date.now() - this.dateContextMenuOpenedMs > 300) {
            // seems like if we hide the menu immediately, some clicks can get propagated to the underlying component
            // see https://github.com/zadam/trilium/pull/3805 for details
            await timeout(100);
            this.$widget.removeClass("show");
            this.$cover.removeClass("show");
            $("body").removeClass("context-menu-shown");
            this.$widget.hide();
        }
    }
}

function timeout(ms: number) {
    return new Promise((accept, reject) => {
        setTimeout(accept, ms);
    });
}

const contextMenu = new ContextMenu();

export default contextMenu;
