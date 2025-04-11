import utils from "../services/utils.js";
import Component from "../components/component.js";
import appContext from "../components/app_context.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import type { TouchBarButton, TouchBarGroup, TouchBarSegmentedControl, TouchBarSpacer } from "@electron/remote";

export type TouchBarItem = (TouchBarButton | TouchBarSpacer | TouchBarGroup | TouchBarSegmentedControl);

export function buildSelectedBackgroundColor(isSelected: boolean) {
    return isSelected ? "#757575" : undefined;
}

export default class TouchBarWidget extends NoteContextAwareWidget {

    nativeImage: typeof import("electron").nativeImage;
    remote: typeof import("@electron/remote");
    lastFocusedComponent?: Component;

    constructor() {
        super();
        this.nativeImage = utils.dynamicRequire("electron").nativeImage;
        this.remote = utils.dynamicRequire("@electron/remote") as typeof import("@electron/remote");
        this.$widget = $("<div>");

        $(window).on("focusin", async (e) => {
            const target = e.target;
            const parentComponentEl = $(target).closest(".component");
            // TODO: Remove typecast once it's no longer necessary.
            this.lastFocusedComponent = appContext.getComponentByEl(parentComponentEl[0]) as Component;
            this.#refreshTouchBar();
        });
    }

    buildIcon(name: string) {
        const sourceImage = this.nativeImage.createFromNamedImage(name, [-1, 0, 1]);
        const { width, height } = sourceImage.getSize();
        const newImage = this.nativeImage.createEmpty();
        newImage.addRepresentation({
            scaleFactor: 1,
            width: width / 2,
            height: height / 2,
            buffer: sourceImage.resize({ height: height / 2 }).toBitmap()
        });
        newImage.addRepresentation({
            scaleFactor: 2,
            width: width,
            height: height,
            buffer: sourceImage.toBitmap()
        });
        return newImage;
    }

    #refreshTouchBar() {
        const { TouchBar } = this.remote;
        const parentComponent = this.lastFocusedComponent;
        if (!parentComponent) {
            return;
        }

        let result = parentComponent.triggerCommand("buildTouchBar", {
            TouchBar,
            buildIcon: this.buildIcon.bind(this)
        }) as unknown as TouchBarItem[];

        const touchBar = this.#buildTouchBar(result);
        this.remote.getCurrentWindow().setTouchBar(touchBar);
    }

    #buildTouchBar(componentSpecificItems?: TouchBarItem[]) {
        const { TouchBar } = this.remote;
        const { TouchBarButton, TouchBarSpacer, TouchBarGroup, TouchBarSegmentedControl, TouchBarOtherItemsProxy } = this.remote.TouchBar;

        // Disregard recursive calls or empty results.
        if (!componentSpecificItems || "then" in componentSpecificItems) {
            componentSpecificItems = [];
        }

        const items = [
            new TouchBarButton({
                icon: this.buildIcon("NSTouchBarComposeTemplate"),
                click: () => this.triggerCommand("createNoteIntoInbox")
            }),
            new TouchBarSpacer({ size: "large" }),
            ...componentSpecificItems,
            new TouchBarOtherItemsProxy(),
            new TouchBarButton({
                icon: this.buildIcon("NSTouchBarAddDetailTemplate"),
                click: () => this.triggerCommand("jumpToNote")
            })
        ].flat();

        console.log("Update ", items);
        return new TouchBar({
            items
        });
    }

    refreshTouchBarEvent() {
        this.#refreshTouchBar();
    }

}
