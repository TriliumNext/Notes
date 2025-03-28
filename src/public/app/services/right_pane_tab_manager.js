/**
 * Manager for tabs in the right pane
 */
class RightPaneTabManager {
    constructor() {
        this.tabs = [];
        this.activeTab = null;
        this.$tabContainer = null;
        this.$contentContainer = null;
        this.initialized = false;
    }

    /**
     * Initialize the tab manager with container elements
     */
    init($tabContainer, $contentContainer) {
        this.$tabContainer = $tabContainer;
        this.$contentContainer = $contentContainer;
        this.initialized = true;
        this.renderTabs();
    }

    /**
     * Add a new tab context
     */
    addTabContext(tabContext) {
        this.tabs.push(tabContext);

        if (this.initialized) {
            this.renderTabs();

            // If this is the first tab, activate it
            if (this.tabs.length === 1) {
                this.activateTab(tabContext);
            }
        }
    }

    /**
     * Render all tabs
     */
    renderTabs() {
        if (!this.initialized) return;

        this.$tabContainer.empty();

        for (const tab of this.tabs) {
            const $tab = $('<div class="right-pane-tab"></div>')
                .attr('data-tab-id', this.tabs.indexOf(tab))
                .append(tab.renderTitle(tab.title))
                .toggleClass('active', tab === this.activeTab)
                .on('click', () => {
                    this.activateTab(tab);
                });

            this.$tabContainer.append($tab);
        }
    }

    /**
     * Activate a specific tab
     */
    activateTab(tabContext) {
        if (this.activeTab === tabContext) return;

        // Deactivate current tab
        if (this.activeTab) {
            this.activeTab.deactivate();
        }

        // Activate new tab
        this.activeTab = tabContext;
        tabContext.activate();

        // Update UI
        if (this.initialized) {
            this.renderTabs();
            this.renderContent();
        }
    }

    /**
     * Render the content of the active tab
     */
    renderContent() {
        if (!this.initialized || !this.activeTab) return;

        this.$contentContainer.empty();

        const widget = this.activeTab.widget;
        if (widget) {
            if (typeof widget.render === 'function') {
                const $renderedWidget = widget.render();
                this.$contentContainer.append($renderedWidget);
            } else if (widget instanceof jQuery) {
                this.$contentContainer.append(widget);
            } else if (widget.nodeType) {
                this.$contentContainer.append($(widget));
            }
        }
    }

    /**
     * Remove a tab
     */
    removeTab(tabContext) {
        const index = this.tabs.indexOf(tabContext);
        if (index !== -1) {
            this.tabs.splice(index, 1);

            if (this.activeTab === tabContext) {
                this.activeTab = this.tabs.length > 0 ? this.tabs[0] : null;
                if (this.activeTab) {
                    this.activeTab.activate();
                }
            }

            if (this.initialized) {
                this.renderTabs();
                this.renderContent();
            }
        }
    }
}

const rightPaneTabManager = new RightPaneTabManager();
export default rightPaneTabManager;
