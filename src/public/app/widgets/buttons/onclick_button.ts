import AbstractButtonWidget, { type AbstractButtonWidgetSettings } from "./abstract_button.js";
import { t } from "../../services/i18n.js";

export type ClickHandler = (widget: OnClickButtonWidget, e: JQuery.ClickEvent<any, any, any, any>) => void;
export type AuxClickHandler = (widget: OnClickButtonWidget, e: JQuery.TriggeredEvent<any, any, any, any>) => void;

interface OnClickButtonWidgetSettings extends AbstractButtonWidgetSettings {
    onClick?: ClickHandler;
    onAuxClick?: AuxClickHandler;
}

export default class OnClickButtonWidget extends AbstractButtonWidget<OnClickButtonWidgetSettings> {
    constructor() {
        super();
        this.settings = {
            titlePlacement: "right",
            title: null,
            icon: null,
            onContextMenu: null
        };
    }

    doRender() {
        super.doRender();

        if (this.settings.onClick) {
            this.$widget.on("click", (e) => {
                this.$widget.tooltip("hide");

                if (this.settings.onClick) {
                    this.settings.onClick(this, e);
                }
            });
        } else {
            console.warn(t("onclick_button.no_click_handler", { componentId: this.componentId }), this.settings);
        }

        if (this.settings.onAuxClick) {
            this.$widget.on("auxclick", (e) => {
                this.$widget.tooltip("hide");

                if (this.settings.onAuxClick) {
                    this.settings.onAuxClick(this, e);
                }
            });
        }
    }

    onClick(handler: ClickHandler) {
        this.settings.onClick = handler;
        return this;
    }

    onAuxClick(handler: AuxClickHandler) {
        this.settings.onAuxClick = handler;
        return this;
    }
}
