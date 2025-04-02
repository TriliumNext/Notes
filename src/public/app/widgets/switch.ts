import { t } from "../services/i18n.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";

const TPL = /*html*/`
<div class="switch-widget">
    <style>
    .switch-widget {
        --switch-track-width: 50px;
        --switch-track-height: 24px;
        --switch-off-track-background: var(--more-accented-background-color);
        --switch-on-track-background: var(--main-text-color);

        --switch-thumb-width: 16px;
        --switch-thumb-height: 16px;
        --switch-off-thumb-background: var(--main-background-color);
        --switch-on-thumb-background: var(--main-background-color);

        display: flex;
        align-items: center;
    }

    /* The track of the toggle switch */

    .switch-widget .switch-button {
        display: block;
        position: relative;
        margin-left: 8px;
        width: var(--switch-track-width);
        height: var(--switch-track-height);
        border-radius: 24px;
        background-color: var(--switch-off-track-background);
        transition: background 200ms ease-in;
    }

    .switch-widget .switch-button.on {
        background: var(--switch-on-track-background);
        transition: background 100ms ease-out;
    }

    /* The thumb of the toggle switch */

    .switch-widget .switch-button:after {
        --y: calc((var(--switch-track-height) - var(--switch-thumb-height)) / 2);
        --x: var(--y);

        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: var(--switch-thumb-width);
        height: var(--switch-thumb-height);
        background-color: var(--switch-off-thumb-background);
        border-radius: 50%;
        transform: translate(var(--x), var(--y));
        transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1),
                    background 200ms ease-out;
    }

    .switch-widget .switch-button.on:after {
        --x: calc(var(--switch-track-width) - var(--switch-thumb-width) - var(--y));

        background: var(--switch-on-thumb-background);
        transition: transform 200ms cubic-bezier(0.64, 0, 0.78, 0),
                    background 100ms ease-in;
    }


    .switch-widget .switch-button input[type="checkbox"] {
        /* A hidden check box for accesibility purposes */
        position: absolute:
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
    }

    /* Disabled state */
    .switch-widget .switch-button:not(.disabled) input[type="checkbox"],
    .switch-widget .switch-button:not(.disabled) {
        cursor: pointer;
    }

    .switch-widget .switch-button:has(input[type="checkbox"]:focus-visible) {
        outline: 2px solid var(--button-border-color);
        outline-offset: 2px;
    }

    .switch-widget .switch-button.disabled {
        opacity: 70%;
    }

    .switch-widget .switch-help-button {
        border: 0;
        margin-left: 4px;
        background: none;
        cursor: pointer;
        font-size: 1.1em;
        color: var(--muted-text-color);
    }

    .switch-widget .switch-help-button:hover {
        color: var(--main-text-color);
    }
    </style>

    <div class="switch-widget">
        <span class="switch-name"></span>

        <label>
            <div class="switch-button">
                <input class="switch-toggle" type="checkbox" />
            </div>
        </label>

        <button class="switch-help-button icon-action bx bx-help-circle" type="button" data-help-page="" title="${t("open-help-page")}" style="display: none;"></button>
    </div>

</div>`;

export default class SwitchWidget extends NoteContextAwareWidget {

    private $switchButton!: JQuery<HTMLElement>;
    private $switchToggle!: JQuery<HTMLElement>;
    private $switchName!: JQuery<HTMLElement>;
    protected $helpButton!: JQuery<HTMLElement>;

    protected switchOnName = "";
    protected switchOnTooltip = "";

    protected switchOffName = "";
    protected switchOffTooltip = "";

    protected disabledTooltip = "";

    private currentState = false;

    doRender() {
        this.$widget = $(TPL);
        this.$switchButton = this.$widget.find(".switch-button");

        this.$switchToggle = this.$widget.find(".switch-toggle");
        this.$switchToggle.on("click", (e) => {
            this.toggle(!this.currentState);

            // Prevent the check box from being toggled by the click, the value of the check box
            // should be set exclusively by the 'isToggled' property setter.
            e.preventDefault();
        });

        this.$switchName = this.$widget.find(".switch-name");
        this.$helpButton = this.$widget.find(".switch-help-button");
    }

    toggle(state: boolean) {
        if (state) {
            this.switchOn();
        } else {
            this.switchOff();
        }
    }

    switchOff() {}
    switchOn() {}

    /** Gets or sets whether the switch is toggled. */
    get isToggled() {
        return this.currentState;
    }

    set isToggled(state) {
        this.currentState = !!state;

        this.$switchButton.toggleClass("on", this.currentState);
        this.$switchToggle.prop("checked", this.currentState);

        if (this.currentState) {
            this.$switchName.text(this.switchOffName);
            this.$switchButton.attr("title", this.switchOffTooltip);
        } else {
            this.$switchName.text(this.switchOnName);
            this.$switchButton.attr("title", this.switchOnTooltip);
        }
    }

    /** Gets or sets whether the switch is enabled. */
    get canToggle() {
        return !this.$switchButton.hasClass("disabled");
    }

    set canToggle(isEnabled) {
        this.$switchButton.toggleClass("disabled", !isEnabled);
        this.$switchToggle.attr("disabled", !isEnabled ? "disabled" : null);

        if (isEnabled) {
            this.isToggled = this.currentState; // Reapply the correct tooltip
        } else {
            this.$switchButton.attr("title", this.disabledTooltip);
        }
    }
}
