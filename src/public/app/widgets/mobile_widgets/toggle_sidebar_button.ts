import BasicWidget from "../basic_widget.js";

const TPL = /*html*/`
<button type="button" class="action-button bx bx-sidebar"></button>`;

class ToggleSidebarButtonWidget extends BasicWidget {
    doRender() {
        this.$widget = $(TPL);

        this.$widget.on("click", () =>
            this.triggerCommand("setActiveScreen", {
                screen: "tree"
            })
        );
    }
}

export default ToggleSidebarButtonWidget;
