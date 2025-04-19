import type { EventData } from "../../components/app_context.js";
import type BasicWidget from "../basic_widget.js";
import FlexContainer, { type FlexDirection } from "../containers/flex_container.js";

export default class ScreenContainer extends FlexContainer<BasicWidget> {
    private screenName: string;

    constructor(screenName: string, direction: FlexDirection) {
        super(direction);

        this.screenName = screenName;
    }

    activeScreenChangedEvent({ activeScreen }: EventData<"activeScreenChanged">) {}
}
