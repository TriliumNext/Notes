import server from "../../../services/server.js";
import { t } from "../../../services/i18n.js";
import AbstractCodeTypeWidget from "../abstract_code_type_widget.js";

const TPL = `<div style="height: 100%; display: flex; flex-direction: column;">
    <style>
        .backend-log-editor {
            flex-grow: 1; 
            width: 100%;
            border: none;
            resize: none;
        }   
    </style>

    <pre class="backend-log-editor"></pre>
    
    <div style="display: flex; justify-content: space-around; margin-top: 10px;">
        <button class="refresh-backend-log-button btn btn-primary">${t("backend_log.refresh")}</button>
    </div>
</div>`;

export default class BackendLogWidget extends AbstractCodeTypeWidget {
    doRender() {
        super.doRender();
        this.$widget = $(TPL);
        this.$editor = this.$widget.find(".backend-log-editor");

        this.$refreshBackendLog = this.$widget.find(".refresh-backend-log-button");
        this.$refreshBackendLog.on("click", () => this.load());
    }

    async refresh() {
        await this.load();
    }

    getExtraOpts() {
        return {
            lineWrapping: false,
            readOnly: true
        };
    }

    async load() {
        const content = await server.get("backend-log");
        await this.initialized;

        this._update(
            {
                mime: "text/plain"
            },
            content
        );
        this.show();
        this.scrollToEnd();
    }
}
