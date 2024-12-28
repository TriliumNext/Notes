import { t } from "../../services/i18n.js";
import utils from "../../services/utils.js";
import BasicWidget from "../basic_widget.js";

const TPL = `
<div class="prompt-dialog modal mx-auto" tabindex="-1" role="dialog" style="z-index: 2000;">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <form class="prompt-dialog-form">
                <div class="modal-header">
                    <h5 class="prompt-title modal-title">${t("prompt.title")}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="${t('prompt.close')}"></button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer">
                    <button class="prompt-dialog-ok-button btn btn-primary btn-sm">${t("prompt.ok")}</button>
                </div>
            </form>
        </div>
    </div>
</div>`;

interface ShownCallbackData {
    $dialog: JQuery<HTMLElement>;
    $question: JQuery<HTMLElement> | null;
    $answer: JQuery<HTMLElement> | null;
    $form: JQuery<HTMLElement>;
}

export interface PromptDialogOptions {
    title?: string;
    message?: string;
    defaultValue?: string;
    shown: PromptShownDialogCallback;
    callback: (value: unknown) => void;
}

export type PromptShownDialogCallback = ((callback: ShownCallbackData) => void) | null;

export default class PromptDialog extends BasicWidget {

    private resolve: ((val: string | null) => void) | null;
    private shownCb: PromptShownDialogCallback;
    
    private modal!: bootstrap.Modal;
    private $dialogBody!: JQuery<HTMLElement>;
    private $question!: JQuery<HTMLElement> | null;
    private $answer!: JQuery<HTMLElement> | null;
    private $form!: JQuery<HTMLElement>;

    constructor() {
        super();

        this.resolve = null;
        this.shownCb = null;
    }

    doRender() {
        this.$widget = $(TPL);
        // TODO: Fix once we use proper ES imports.
        //@ts-ignore
        this.modal = bootstrap.Modal.getOrCreateInstance(this.$widget);
        this.$dialogBody = this.$widget.find(".modal-body");
        this.$form = this.$widget.find(".prompt-dialog-form");
        this.$question = null;
        this.$answer = null;

        this.$widget.on('shown.bs.modal', () => {
            if (this.shownCb) {
                this.shownCb({
                    $dialog: this.$widget,
                    $question: this.$question,
                    $answer: this.$answer,
                    $form: this.$form
                });
            }

            this.$answer?.trigger('focus').select();
        });

        this.$widget.on("hidden.bs.modal", () => {
            if (this.resolve) {
                this.resolve(null);
            }
        });

        this.$form.on('submit', e => {
            e.preventDefault();
            if (this.resolve) {
                this.resolve(this.$answer?.val() as string);
            }

            this.modal.hide();
        });
    }

    showPromptDialogEvent({ title, message, defaultValue, shown, callback }: PromptDialogOptions) {
        this.shownCb = shown;
        this.resolve = callback;

        this.$widget.find(".prompt-title").text(title || t("prompt.defaultTitle"));

        this.$question = $("<label>")
            .prop("for", "prompt-dialog-answer")
            .text(message || "");

        this.$answer = $("<input>")
            .prop("type", "text")
            .prop("id", "prompt-dialog-answer")
            .addClass("form-control")
            .val(defaultValue || "");

        this.$dialogBody.empty().append(
            $("<div>")
                .addClass("form-group")
                .append(this.$question)
                .append(this.$answer));

        utils.openDialog(this.$widget, false);
    }
}
