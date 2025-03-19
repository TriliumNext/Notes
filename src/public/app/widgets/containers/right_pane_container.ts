import FlexContainer from "./flex_container.js";
import splitService from "../../services/resizer.js";
import type RightPanelWidget from "../right_panel_widget.js";
import type { EventData, EventNames } from "../../components/app_context.js";
import options from "../../services/options.js";

export default class RightPaneContainer extends FlexContainer<RightPanelWidget> {

    constructor() {
        super("column");

        this.id("right-pane");
        this.css("height", "100%");
        this.collapsible();
    }

    isEnabled() {
        return super.isEnabled() && options.is("rightPaneVisible");
    }

    async handleEventInChildren<T extends EventNames>(name: T, data: EventData<T>) {
        const promise = super.handleEventInChildren(name, data);

        if (["activeContextChanged", "noteSwitchedAndActivated", "noteSwitched"].includes(name)) {
            // the right pane is displayed only if some child widget is active,
            // we'll reevaluate the visibility based on events which are probable to cause visibility change
            // but these events need to be finished and only then we check
            if (promise) {
                promise.then(() => this.reEvaluateRightPaneVisibilityCommand());
            } else {
                this.reEvaluateRightPaneVisibilityCommand();
            }
        }

        return promise;
    }

    reEvaluateRightPaneVisibilityCommand() {
        this.toggleInt(this.isEnabled());
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.isOptionReloaded("rightPaneVisible")) {
            const visible = this.isEnabled();
            this.toggleInt(visible);
        }
    }

}
