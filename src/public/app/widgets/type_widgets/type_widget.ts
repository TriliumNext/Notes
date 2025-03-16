import NoteContextAwareWidget from "../note_context_aware_widget.js";
import appContext, { type EventData, type EventNames } from "../../components/app_context.js";
import type FNote from "../../entities/fnote.js";
import type NoteDetailWidget from "../note_detail.js";
import type SpacedUpdate from "../../services/spaced_update.js";

export default abstract class TypeWidget extends NoteContextAwareWidget {

    spacedUpdate!: SpacedUpdate;

    // for overriding
    static getType() {}

    doRender() {
        this.contentSized();

        return super.doRender();
    }

    doRefresh(note: FNote | null | undefined) {}

    async refresh() {
        const thisWidgetType = (this.constructor as any).getType();
        const noteWidgetType = await (this.parent as NoteDetailWidget).getWidgetType();

        if (thisWidgetType !== noteWidgetType) {
            this.toggleInt(false);

            this.cleanup();
        } else {
            this.toggleInt(true);

            await this.doRefresh(this.note);

            this.triggerEvent("noteDetailRefreshed", { ntxId: this.noteContext?.ntxId });
        }
    }

    isActive() {
        return this.$widget.is(":visible") && this.noteContext?.ntxId === appContext.tabManager.activeNtxId;
    }

    /** @returns {Promise<Object>|*} promise resolving note data. Note data is an object with content. */
    getData() {}

    focus() {}

    scrollToEnd() {
        // Do nothing by default.
    }

    dataSaved() {
        // Do nothing by default.
    }

    async readOnlyTemporarilyDisabledEvent({ noteContext }: EventData<"readOnlyTemporarilyDisabled">) {
        if (this.isNoteContext(noteContext.ntxId)) {
            await this.refresh();

            this.focus();
        }
    }

    // events should be propagated manually to the children widgets
    handleEventInChildren<T extends EventNames>(name: T, data: EventData<T>) {
        if (["activeContextChanged", "setNoteContext"].includes(name)) {
            // won't trigger .refresh();
            return super.handleEventInChildren("setNoteContext", data as EventData<"activeContextChanged">);
        } else if (name === "entitiesReloaded") {
            return super.handleEventInChildren(name, data);
        } else {
            return Promise.resolve();
        }
    }
}
