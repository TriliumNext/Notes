import type BasicWidget from "../basic_widget.js";
import FlexContainer from "./flex_container.js";

export default class RootContainer extends FlexContainer<BasicWidget> {
    constructor(isHorizontalLayout: boolean) {
        super(isHorizontalLayout ? "column" : "row");

        this.id("root-widget");
        this.css("height", "100dvh");
    }
}
