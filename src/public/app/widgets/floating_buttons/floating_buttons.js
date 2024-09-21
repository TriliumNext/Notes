import NoteContextAwareWidget from "../note_context_aware_widget.js";
import { t } from "../../services/i18n.js";

const TPL = `
<div class="floating-buttons no-print">
    <style>
        .floating-buttons {
            position: relative;
        }
        
        .floating-buttons-children,.show-floating-buttons {
            position: absolute; 
            top: 10px; 
            right: 10px;
            display: flex;
            flex-direction: row;
            z-index: 100;
        }
        
        .type-canvas .floating-buttons-children {
            top: 70px; 
        }
        
        .floating-buttons-children > *:not(.hidden-int):not(.no-content-hidden) {
            margin-left: 10px;
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
            title="${t('show_floating_buttons_button.button_title')}"></button>
    </div>
</div>`;

export default class FloatingButtons extends NoteContextAwareWidget {
    doRender() {
        this.$widget = $(TPL);
        this.$children = this.$widget.find(".floating-buttons-children");

        for (const widget of this.children) {
            this.$children.append(widget.render());
        }
    }

    async refreshWithNote(note) {
        this.toggle(true);
        this.$widget.find(".show-floating-buttons-button").on('click', () => this.toggle(true));
    }

    toggle(show) {
        this.$widget.find(".floating-buttons-children").toggleClass("temporarily-hidden", !show);
    }

    hideFloatingButtonsCommand() {
        this.toggle(false);
    }
}
