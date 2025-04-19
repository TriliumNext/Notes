import { t } from "../../services/i18n.js";
import NoteContextAwareWidget from "../note_context_aware_widget.js";
import AttributeDetailWidget from "../attribute_widgets/attribute_detail.js";
import AttributeEditorWidget from "../attribute_widgets/attribute_editor.js";
import type { CommandListenerData } from "../../components/app_context.js";
import type FAttribute from "../../entities/fattribute.js";

const TPL = /*html*/`
<div class="attribute-list">
    <style>
        .attribute-list {
            margin-left: 7px;
            margin-right: 7px;
            margin-top: 5px;
            margin-bottom: 2px;
            position: relative;
        }

        .attribute-list-editor p {
            margin: 0 !important;
        }
    </style>

    <div class="attr-editor-placeholder"></div>
</div>
`;

export default class OwnedAttributeListWidget extends NoteContextAwareWidget {

    private attributeDetailWidget: AttributeDetailWidget;
    private attributeEditorWidget: AttributeEditorWidget;
    private $title!: JQuery<HTMLElement>;

    get name() {
        return "ownedAttributes";
    }

    get toggleCommand() {
        return "toggleRibbonTabOwnedAttributes";
    }

    constructor() {
        super();

        this.attributeDetailWidget = new AttributeDetailWidget().contentSized().setParent(this);

        this.attributeEditorWidget = new AttributeEditorWidget(this.attributeDetailWidget).contentSized().setParent(this);

        this.child(this.attributeEditorWidget, this.attributeDetailWidget);
    }

    getTitle() {
        return {
            show: !this.note?.isLaunchBarConfig(),
            title: t("owned_attribute_list.owned_attributes"),
            icon: "bx bx-list-check"
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$widget.find(".attr-editor-placeholder").replaceWith(this.attributeEditorWidget.render());
        this.$widget.append(this.attributeDetailWidget.render());

        this.$title = $("<div>");
    }

    async saveAttributesCommand() {
        await this.attributeEditorWidget.save();
    }

    async reloadAttributesCommand() {
        await this.attributeEditorWidget.refresh();
    }

    async updateAttributeListCommand({ attributes }: CommandListenerData<"updateAttributeList">) {
        // TODO: See why we need FAttribute[] and Attribute[]
        await this.attributeEditorWidget.updateAttributeList(attributes as FAttribute[]);
    }

    focus() {
        this.attributeEditorWidget.focus();
    }
}
