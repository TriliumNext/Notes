import { t } from "../../services/i18n.js";
import TypeWidget from "./type_widget.js";
import attributeService from "../../services/attributes.js";
import type FNote from "../../entities/fnote.js";
import type { EventData } from "../../components/app_context.js";
import utils from "../../services/utils.js";

const TPL = `
<div class="note-detail-web-view note-detail-printable" style="height: 100%">
    <div class="note-detail-web-view-help alert alert-warning" style="margin: 50px; padding: 20px 20px 0px 20px;">
        <h4>${t("web_view.web_view")}</h4>

        <p>${t("web_view.embed_websites")}</p>

        <p>${t("web_view.create_label")}</p>
    </div>

    ${buildElement()}
</div>`;

function buildElement() {
    if (!utils.isElectron()) {
        return `<iframe class="note-detail-web-view-content" sandbox="allow-same-origin allow-scripts"></iframe>`;
    } else {
        return `<webview class="note-detail-web-view-content"></webview>`;
    }
}

export default class WebViewTypeWidget extends TypeWidget {

    private $noteDetailWebViewHelp!: JQuery<HTMLElement>;
    private $noteDetailWebViewContent!: JQuery<HTMLElement>;

    static getType() {
        return "webView";
    }

    doRender() {
        this.$widget = $(TPL);
        this.$noteDetailWebViewHelp = this.$widget.find(".note-detail-web-view-help");
        this.$noteDetailWebViewContent = this.$widget.find(".note-detail-web-view-content");

        window.addEventListener("resize", () => this.setDimensions(), false);

        super.doRender();
    }

    async doRefresh(note: FNote) {
        this.$widget.show();
        this.$noteDetailWebViewHelp.hide();
        this.$noteDetailWebViewContent.hide();

        if (!this.note) {
            return;
        }

        const webViewSrc = this.note.getLabelValue("webViewSrc");

        if (webViewSrc) {
            this.$noteDetailWebViewContent.show().attr("src", webViewSrc);
        } else {
            this.$noteDetailWebViewContent.hide();
            this.$noteDetailWebViewHelp.show();
        }

        this.setDimensions();

        setTimeout(() => this.setDimensions(), 1000);
    }

    cleanup() {
        this.$noteDetailWebViewContent.removeAttr("src");
    }

    setDimensions() {
        const $parent = this.$widget;

        this.$noteDetailWebViewContent
            .height($parent.height() ?? 0)
            .width($parent.width() ?? 0);
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.getAttributeRows().find((attr) => attr.name === "webViewSrc" && attributeService.isAffecting(attr, this.noteContext?.note))) {
            this.refresh();
        }
    }
}
