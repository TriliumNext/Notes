import FlexContainer from "../containers/flex_container.js";

export default class ScreenContainer extends FlexContainer {
    constructor(screenName, direction) {
        super(direction);

        this.screenName = screenName;
    }

    activeScreenChangedEvent({activeScreen}) {

    }
}
