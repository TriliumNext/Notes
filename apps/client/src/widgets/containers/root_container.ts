import utils from "../../services/utils.js";
import type BasicWidget from "../basic_widget.js";
import FlexContainer from "./flex_container.js";

/**
 * The root container is the top-most widget/container, from which the entire layout derives.
 *
 * For convenience, the root container has a few class selectors that can be used to target some global state:
 *
 * - `#root-container.virtual-keyboard-opened`, on mobile devices if the virtual keyboard is open.
 * - `#root-container.horizontal-layout`, if the current layout is horizontal.
 * - `#root-container.vertical-layout`, if the current layout is horizontal.
 */
export default class RootContainer extends FlexContainer<BasicWidget> {
    private originalViewportHeight: number;

    constructor(isHorizontalLayout: boolean) {
        super(isHorizontalLayout ? "column" : "row");

        this.id("root-widget");
        this.css("height", "100dvh");
        this.originalViewportHeight = getViewportHeight();
    }

    render(): JQuery<HTMLElement> {
        if (utils.isMobile()) {
            window.visualViewport?.addEventListener("resize", () => this.#onMobileResize());
        }

        return super.render();
    }

    #onMobileResize() {
        const currentViewportHeight = getViewportHeight();
        const isKeyboardOpened = (currentViewportHeight < this.originalViewportHeight);
        this.$widget.toggleClass("virtual-keyboard-opened", isKeyboardOpened);
    }

}

function getViewportHeight() {
    return window.visualViewport?.height ?? window.innerHeight;
}
