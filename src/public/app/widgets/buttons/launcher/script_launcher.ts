import type FNote from "../../../entities/fnote.js";
import AbstractLauncher from "./abstract_launcher.js";

export default class ScriptLauncher extends AbstractLauncher {
    constructor(launcherNote: FNote) {
        super(launcherNote);

        this.title(() => this.launcherNote.title)
            .icon(() => this.launcherNote.getIcon())
            .onClick(() => this.launch());
    }

    async launch() {
        if (this.launcherNote.isLabelTruthy("scriptInLauncherContent")) {
            await this.launcherNote.executeScript();
        } else {
            const script = await this.launcherNote.getRelationTarget("script");
            if (script) {
                await script.executeScript();
            }
        }
    }
}
