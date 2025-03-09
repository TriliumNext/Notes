/**
 * TabContext represents a tab in the right pane that can contain any widget
 */
export default class TabContext {
    /**
     * @param {string} title - Tab title
     * @param {object} widget - Widget to display in the tab
     */
    constructor(title, widget) {
        this.title = title;
        this.widget = widget;
        this.active = false;
    }

    /**
     * Custom renderer for the tab title
     * @param {string} title
     * @returns {JQuery}
     */
    renderTitle(title) {
        return $(`<span class="tab-title">${title}</span>`);
    }

    /**
     * Activate this tab
     */
    activate() {
        this.active = true;

        if (this.widget && typeof this.widget.activeTabChanged === 'function') {
            this.widget.activeTabChanged(true);
        }

        if (typeof rightPaneTabManager.activateTab === 'function') {
            rightPaneTabManager.activateTab(this);
        }
    }

    /**
     * Deactivate this tab
     */
    deactivate() {
        this.active = false;

        if (this.widget && typeof this.widget.activeTabChanged === 'function') {
            this.widget.activeTabChanged(false);
        }
    }
}
