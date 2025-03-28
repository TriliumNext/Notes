import BasicWidget from "./basic_widget.js";

/**
 * Base class for widgets that need to track the active tab/note
 */
export default class TabAwareWidget extends BasicWidget {
    constructor() {
        super();
        this.noteId = null;
        this.noteType = null;
        this.notePath = null;
        this.isActiveTab = false;
    }

    /**
     * Called when the active note is switched
     *
     * @param {string} noteId
     * @param {string|null} noteType
     * @param {string|null} notePath
     */
    async noteSwitched(noteId, noteType, notePath) {
        this.noteId = noteId;
        this.noteType = noteType;
        this.notePath = notePath;
    }

    /**
     * Called when the widget's tab becomes active or inactive
     *
     * @param {boolean} active
     */
    activeTabChanged(active) {
        this.isActiveTab = active;
    }

    /**
     * Called when entities (notes, attributes, etc.) are reloaded
     */
    entitiesReloaded() {}

    /**
     * Check if this widget is enabled
     */
    isEnabled() {
        return true;
    }

    /**
     * Refresh widget with current data
     */
    async refresh() {}
}
