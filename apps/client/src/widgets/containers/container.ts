import type { default as Component, TypedComponent } from "../../components/component.js";
import BasicWidget, { TypedBasicWidget } from "../basic_widget.js";

export default class Container<T extends TypedComponent<any>> extends TypedBasicWidget<T> {
    doRender() {
        this.$widget = $(`<div>`);
        this.renderChildren();
    }

    renderChildren() {
        for (const widget of this.children) {
            if (!("render" in widget)) {
                throw "Non-renderable widget encountered.";
            }

            const typedWidget = widget as unknown as TypedBasicWidget<any>;

            try {
                if ("render" in widget) {
                    this.$widget.append(typedWidget.render());
                }
            } catch (e: any) {
                typedWidget.logRenderingError(e);
            }
        }
    }
}
