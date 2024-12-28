import FlexContainer from "../containers/flex_container.js";

export default class SidebarContainer extends FlexContainer {

    constructor(screenName, direction) {
        super(direction);

        this.screenName = screenName;
    }

    doRender() {
        super.doRender();

        this.$widget.on("click", () => {
            this.triggerCommand('setActiveScreen', {
                screen: "detail"
            });
        });
    }

    activeScreenChangedEvent({activeScreen}) {
        if (activeScreen === this.screenName) {
            this.$widget.addClass('show');
        } else {
            this.$widget.removeClass('show');
        }
    }

}
