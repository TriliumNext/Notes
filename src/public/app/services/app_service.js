import options from "../../../services/options.js";
import ChatWidget from "../widgets/llm/chat_widget.js";
import TabContext from "../widgets/right_panel_tabs.js";
import rightPaneTabManager from "./right_pane_tab_manager.js";
import keyboardActionsService from "./keyboard_actions.js";

function initComponents() {
    // ... existing code ...

    addChatTab();

    // ... existing code ...
}

function addChatTab() {
    if (!options.getOptionBool('llmEnabled')) {
        return;
    }

    const chatWidget = new ChatWidget();

    // Add chat widget to the right pane
    const chatTab = new TabContext("AI Chat", chatWidget);
    chatTab.renderTitle = title => {
        return $(`<span class="tab-title"><span class="bx bx-bot"></span> ${title}</span>`);
    };

    rightPaneTabManager.addTabContext(chatTab);

    // Add chat button to the global menu
    const $button = $('<button class="button-widget global-menu-button" title="Open AI Chat (Ctrl+Shift+C)"><span class="bx bx-chat"></span></button>');

    $button.on('click', () => {
        chatTab.activate();
        chatWidget.refresh();
    });

    $button.insertBefore($('.global-menu-button:first')); // Add to the beginning of global menu

    // Add keyboard shortcut
    keyboardActionsService.setupActionsForScope('window', {
        'openAiChat': {
            'enabled': true,
            'title': 'Open AI Chat',
            'clickNote': true,
            'shortcutKeys': {
                'keyCode': 'C',
                'ctrlKey': true,
                'shiftKey': true
            },
            'handler': () => {
                chatTab.activate();
                chatWidget.refresh();
            }
        }
    });
}

// Export the functions to make them available to other modules
export default {
    initComponents,
    addChatTab
};
