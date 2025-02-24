import Component from "./component.js";
import type { CommandListener, CommandListenerData } from "./app_context.js";

export type Screen = "detail" | "tree";

export default class MobileScreenSwitcherExecutor extends Component implements CommandListener<"setActiveScreen"> {
    private activeScreen?: Screen;

    setActiveScreenCommand({ screen }: CommandListenerData<"setActiveScreen">) {
        if (screen !== this.activeScreen) {
            this.activeScreen = screen;
            this.triggerEvent("activeScreenChanged", { activeScreen: screen });
        }
    }
}
