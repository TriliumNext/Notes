import NoteContextAwareWidget from "../note_context_aware_widget.js";
import { t } from "../../services/i18n.js";
import type FNote from "../../entities/fnote.js";
import type BasicWidget from "../basic_widget.js";

/*
 * Note:
 *
 * For floating button widgets that require content to overflow, the has-overflow CSS class should
 * be applied to the root element of the widget. Additionally, this root element may need to
 * properly handle rounded corners, as defined by the --border-radius CSS variable.
 */

const TPL = `
<div class="floating-buttons no-print">
    <style>
        .floating-buttons {
            position: relative;
        }

        .floating-buttons-children,
        .show-floating-buttons {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: row;
            z-index: 100;
        }

        .note-split.rtl .floating-buttons-children,
        .note-split.rtl .show-floating-buttons {
            right: unset;
            left: 10px;
        }

        .note-split.rtl .close-floating-buttons {
            order: -1;
        }

        .note-split.rtl .close-floating-buttons,
        .note-split.rtl .show-floating-buttons {
            transform: rotate(180deg);
        }

        .type-canvas .floating-buttons-children {
            top: 70px;
        }

        .type-canvas .floating-buttons-children > * {
            --border-radius: 0; /* Overridden by themes */
        }

        .floating-buttons-children > *:not(.hidden-int):not(.no-content-hidden) {
            margin: 2px;
        }

        .floating-buttons-children > *:not(.has-overflow) {
            overflow: hidden;
        }

        .floating-buttons-children > button, .floating-buttons-children .floating-button {
            font-size: 150%;
            padding: 5px 10px 4px 10px;
            width: 40px;
            cursor: pointer;
            color: var(--button-text-color);
            background: var(--button-background-color);
            border-radius: var(--button-border-radius);
            border: 1px solid transparent;
            display: flex;
            justify-content: space-around;
        }

        .floating-buttons-children > button:hover, .floating-buttons-children .floating-button:hover {
            text-decoration: none;
            border-color: var(--button-border-color);
        }

        .floating-buttons .floating-buttons-children.temporarily-hidden {
            display: none;
        }
    </style>

    <div class="floating-buttons-children"></div>

    <!-- Show button that displays floating button after click on close button -->
    <div class="show-floating-buttons">
        <style>
            .floating-buttons-children.temporarily-hidden+.show-floating-buttons {
                display: block;
            }

            .floating-buttons-children:not(.temporarily-hidden)+.show-floating-buttons {
                display: none;
            }

            .show-floating-buttons {
                /* display: none;*/
                margin-left: 5px !important;
            }

            .show-floating-buttons-button {
                border: 1px solid transparent;
                color: var(--button-text-color);
                padding: 6px;
                border-radius: 100px;
            }

            .show-floating-buttons-button:hover {
                border: 1px solid var(--button-border-color);
            }
        </style>

        <button type="button" class="show-floating-buttons-button btn bx bx-chevrons-left"
            title="${t("show_floating_buttons_button.button_title")}"></button>
    </div>
</div>`;

export default class FloatingButtons extends NoteContextAwareWidget {

    private $children!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$children = this.$widget.find(".floating-buttons-children");

        for (const widget of this.children) {
            if ("render" in widget) {
                this.$children.append((widget as BasicWidget).render());
            }
        }
    }

    async refreshWithNote(note: FNote) {
        this.toggle(true);
        this.$widget.find(".show-floating-buttons-button").on("click", () => this.toggle(true));
    }

    toggle(show: boolean) {
        this.$widget.find(".floating-buttons-children").toggleClass("temporarily-hidden", !show);
    }

    hideFloatingButtonsCommand() {
        this.toggle(false);
    }
}
