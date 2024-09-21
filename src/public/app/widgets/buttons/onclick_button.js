import AbstractButtonWidget from "./abstract_button.js";
import { t } from "../../services/i18n.js";

export default class OnClickButtonWidget extends AbstractButtonWidget {
    doRender() {
        super.doRender();

        if (this.settings.onClick) {
            this.$widget.on("click", e => {
                this.$widget.tooltip("hide");

                this.settings.onClick(this, e);
            });
        } else {
            console.warn(t("onclick_button.no_click_handler", { componentId: this.componentId }), this.settings);
        }

        if (this.settings.onAuxClick) {
            this.$widget.on("auxclick", e => {
                this.$widget.tooltip("hide");

                this.settings.onAuxClick(this, e);
            });
        }
    }

    onClick(handler) {
        this.settings.onClick = handler;
        return this;
    }

    onAuxClick(handler) {
        this.settings.onAuxClick = handler;
        return this;
    }
}
