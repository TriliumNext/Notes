import BasicWidget from "../basic_widget.js";

const TPL = `
<button type="button" class="action-button bx bx-sidebar" style="padding-top: 10px;"></button>`;

class ToggleSidebarButtonWidget extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$widget.on('click', () => this.triggerCommand('setActiveScreen', {
            screen: 'tree'
        }));
    }
}

export default ToggleSidebarButtonWidget;
