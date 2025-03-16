import type { EventData } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";

export interface ViewModeArgs {
    $parent: JQuery<HTMLElement>;
    parentNote: FNote;
    noteIds: string[];
    showNotePath?: boolean;
}

export default abstract class ViewMode {

    constructor(args: ViewModeArgs) {
        // note list must be added to the DOM immediately, otherwise some functionality scripting (canvas) won't work
        args.$parent.empty();
    }

    abstract renderList(): Promise<JQuery<HTMLElement> | undefined>;

    /**
     * Called whenever an "entitiesReloaded" event has been received by the parent component.
     *
     * @param e the event data.
     * @return {@code true} if the view should be re-rendered, a falsy value otherwise.
     */
    onEntitiesReloaded(e: EventData<"entitiesReloaded">): boolean | void {
        // Do nothing by default.
    }

    get isFullHeight() {
        // Override to change its value.
        return false;
    }

}
