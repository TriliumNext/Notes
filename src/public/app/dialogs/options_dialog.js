import server from "../services/server.js";
import utils from "../services/utils.js";
import AppearanceOptions from "./options/appearance.js";
import LLMOptions from "./options/llm.js";

const TPL = `
<div class="options-dialog modal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Options</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-3">
                        <ul class="nav nav-pills flex-column">
                            <li class="nav-item"><a class="nav-link active" data-tab-page="appearance">Appearance</a></li>
                            <li class="nav-item"><a class="nav-link" data-tab-page="llm">LLM Integration</a></li>
                        </ul>
                    </div>
                    <div class="col-9">
                        <div class="tab-content">
                            <div class="tab-pane active" id="appearance-settings"></div>
                            <div class="tab-pane" id="llm-settings"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary btn-sm">Save & Close</button>
            </div>
        </div>
    </div>
</div>`;

export default class OptionsDialog {
    constructor() {
        this.$dialog = $(TPL);
        this.$tabContainer = this.$dialog.find('.tab-content');
        this.$saveButton = this.$dialog.find('.modal-footer button');
        this.$navLinks = this.$dialog.find('.nav-link');

        this.appearanceOptions = new AppearanceOptions();
        this.llmOptions = new LLMOptions();

        this.$dialog.find('#appearance-settings').append(this.appearanceOptions.$widget);
        this.$dialog.find('#llm-settings').append(this.llmOptions.$widget);

        this.$navLinks.on('click', e => {
            this.$navLinks.removeClass("active");
            $(e.target).addClass("active");

            this.$tabContainer.find('.tab-pane').removeClass("active");
            this.$tabContainer.find(`#${$(e.target).attr('data-tab-page')}-settings`).addClass("active");
        });

        this.$saveButton.on('click', async () => {
            const options = await this.save();

            this.$dialog.modal('hide');

            utils.reloadFrontendApp();
        });
    }

    async optionsLoaded(options) {
        await this.appearanceOptions.optionsLoaded(options);
        await this.llmOptions.optionsLoaded(options);
    }

    async save() {
        const options = await server.get('options');

        await this.appearanceOptions.save(options);
        await this.llmOptions.save(options);

        await server.put('options', options);

        return options;
    }

    async showDialog() {
        utils.openDialog(this.$dialog);

        const options = await server.get('options');

        await this.optionsLoaded(options);
    }
}
