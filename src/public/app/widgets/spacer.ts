import { t } from "../services/i18n.js";
import BasicWidget from "./basic_widget.js";
import contextMenu from "../menus/context_menu.js";
import appContext from "../components/app_context.js";
import utils from "../services/utils.js";

const TPL = `<div class="spacer"></div>`;

export default class SpacerWidget extends BasicWidget {
    private baseSize: number;
    private growthFactor: number;

    constructor(baseSize = 0, growthFactor = 1000) {
        super();

        this.baseSize = baseSize;
        this.growthFactor = growthFactor;
    }

    doRender() {
        this.$widget = $(TPL);
        this.$widget.css("flex-basis", this.baseSize);
        this.$widget.css("flex-grow", this.growthFactor);
        this.$widget.css("flex-shrink", 1000);

        this.$widget.on("contextmenu", (e) => {
            this.$widget.tooltip("hide");

            contextMenu.show({
                x: e.pageX,
                y: e.pageY,
                items: [{ title: t("spacer.configure_launchbar"), command: "showLaunchBarSubtree", uiIcon: "bx " + (utils.isMobile() ? "bx-mobile" : "bx-sidebar") }],
                selectMenuItemHandler: ({ command }) => {
                    if (command) {
                        appContext.triggerCommand(command);
                    }
                }
            });

            return false; // blocks default browser right click menu
        });
    }
}
