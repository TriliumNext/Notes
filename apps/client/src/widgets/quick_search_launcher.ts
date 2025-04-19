import utils from "../services/utils.js";
import QuickSearchWidget from "./quick_search.js";

/**
 * Similar to the {@link QuickSearchWidget} but meant to be included inside the launcher bar.
 *
 * <p>
 * Adds specific tweaks such as:
 *
 * - Hiding the widget on mobile.
 */
export default class QuickSearchLauncherWidget extends QuickSearchWidget {

    private isHorizontalLayout: boolean;

    constructor(isHorizontalLayout: boolean) {
        super();
        this.isHorizontalLayout = isHorizontalLayout;
    }

    isEnabled() {
        if (!this.isHorizontalLayout) {
            // The quick search widget is added somewhere else on the vertical layout.
            return false;
        }

        if (utils.isMobile()) {
            // The widget takes too much spaces to be included in the mobile layout.
            return false;
        }

        return super.isEnabled();
    }
}
