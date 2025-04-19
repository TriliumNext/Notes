import type { EventData } from "../../components/app_context.js";
import { t } from "../../services/i18n.js";
import options from "../../services/options.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";

const TPL = /*html*/`
<button type="button"
    class="switch-layout-button">
    <span class="bx"></span>
</button>
`;

export default class SwitchSplitOrientationButton extends NoteContextAwareWidget {
    isEnabled() {
        return super.isEnabled()
            && ["mermaid"].includes(this.note?.type ?? "")
            && this.note?.isContentAvailable()
            && !this.note?.hasLabel("readOnly")
            && this.noteContext?.viewScope?.viewMode === "default";
    }

    doRender(): void {
        super.doRender();
        this.$widget = $(TPL);
        this.$widget.on("click", () => {
            const currentOrientation = options.get("splitEditorOrientation");
            options.save("splitEditorOrientation", toggleOrientation(currentOrientation));
        });
        this.#adjustIcon();
        this.contentSized();
    }

    #adjustIcon() {
        const currentOrientation = options.get("splitEditorOrientation");
        const upcomingOrientation = toggleOrientation(currentOrientation);
        const $icon = this.$widget.find("span.bx");
        $icon
            .toggleClass("bxs-dock-bottom", upcomingOrientation === "vertical")
            .toggleClass("bxs-dock-left", upcomingOrientation === "horizontal");

        if (upcomingOrientation === "vertical") {
            this.$widget.attr("title", t("switch_layout_button.title_vertical"));
        } else {
            this.$widget.attr("title", t("switch_layout_button.title_horizontal"));
        }
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.isOptionReloaded("splitEditorOrientation")) {
            this.#adjustIcon();
        }
    }

}

function toggleOrientation(orientation: string) {
    if (orientation === "horizontal") {
        return "vertical";
    } else {
        return "horizontal";
    }
}
