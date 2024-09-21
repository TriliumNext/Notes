import BasicWidget from "../basic_widget.js";

const TPL = `
<div class="dropdown right-dropdown-widget dropend">
    <style>
    .right-dropdown-widget {
        height: 53px;
    }
    </style>

    <button type="button" data-bs-toggle="dropdown" data-placement="right"
            aria-haspopup="true" aria-expanded="false" 
            class="bx right-dropdown-button launcher-button"></button>
    
    <div class="tooltip-trigger"></div>

    <div class="dropdown-menu dropdown-menu-right"></div>
</div>
`;

export default class RightDropdownButtonWidget extends BasicWidget {
    constructor(title, iconClass, dropdownTpl) {
        super();

        this.iconClass = iconClass;
        this.title = title;
        this.dropdownTpl = dropdownTpl;
    }

    doRender() {
        this.$widget = $(TPL);
        this.$dropdownMenu = this.$widget.find(".dropdown-menu");
        this.dropdown = bootstrap.Dropdown.getOrCreateInstance(this.$widget.find("[data-bs-toggle='dropdown']"));

        this.$tooltip = this.$widget.find(".tooltip-trigger").attr("title", this.title);
        this.tooltip = new bootstrap.Tooltip(this.$tooltip);

        this.$widget.find(".right-dropdown-button")
            .addClass(this.iconClass)
            .on("click", () => this.tooltip.hide())
            .on('mouseenter', () => this.tooltip.show())
            .on('mouseleave', () => this.tooltip.hide());

        this.$widget.on('show.bs.dropdown', async () => {
            await this.dropdownShown();

            const rect = this.$dropdownMenu[0].getBoundingClientRect();
            const pixelsToBottom = $(window).height() - rect.bottom;

            if (pixelsToBottom < 0) {
                this.$dropdownMenu.css("top", pixelsToBottom);
            }
        });

        this.$dropdownContent = $(this.dropdownTpl);
        this.$widget.find(".dropdown-menu").append(this.$dropdownContent);
    }

    // to be overridden
    async dropdownShow() { }
}
