import NoteContextAwareWidget from "../note_context_aware_widget.js";
import AttributeDetailWidget from "../attribute_widgets/attribute_detail.js";
import attributeRenderer from "../../services/attribute_renderer.js";
import attributeService from "../../services/attributes.js";
import { t } from "../../services/i18n.js";
import type FNote from "../../entities/fnote.js";
import type { EventData } from "../../components/app_context.js";

const TPL = `
<div class="inherited-attributes-widget">
    <style>
    .inherited-attributes-widget {
        position: relative;
    }

    .inherited-attributes-container {
        color: var(--muted-text-color);
        max-height: 200px;
        overflow: auto;
        padding: 14px 12px 13px 12px;
    }
    </style>

    <div class="inherited-attributes-container"></div>
</div>`;

export default class InheritedAttributesWidget extends NoteContextAwareWidget {

    private attributeDetailWidget: AttributeDetailWidget;

    private $container!: JQuery<HTMLElement>;

    get name() {
        return "inheritedAttributes";
    }

    get toggleCommand() {
        return "toggleRibbonTabInheritedAttributes";
    }

    constructor() {
        super();

        this.attributeDetailWidget = new AttributeDetailWidget().contentSized().setParent(this);

        this.child(this.attributeDetailWidget);
    }

    getTitle() {
        return {
            show: !this.note?.isLaunchBarConfig(),
            title: t("inherited_attribute_list.title"),
            icon: "bx bx-list-plus"
        };
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$container = this.$widget.find(".inherited-attributes-container");
        this.$widget.append(this.attributeDetailWidget.render());
    }

    async refreshWithNote(note: FNote) {
        this.$container.empty();

        const inheritedAttributes = this.getInheritedAttributes(note);

        if (inheritedAttributes.length === 0) {
            this.$container.append(t("inherited_attribute_list.no_inherited_attributes"));
            return;
        }

        for (const attribute of inheritedAttributes) {
            const $attr = (await attributeRenderer.renderAttribute(attribute, false)).on("click", (e) => {
                setTimeout(
                    () =>
                        this.attributeDetailWidget.showAttributeDetail({
                            attribute: {
                                noteId: attribute.noteId,
                                type: attribute.type,
                                name: attribute.name,
                                value: attribute.value,
                                isInheritable: attribute.isInheritable
                            },
                            isOwned: false,
                            x: e.pageX,
                            y: e.pageY
                        }),
                    100
                );
            });

            this.$container.append($attr).append(" ");
        }
    }

    getInheritedAttributes(note: FNote) {
        const attrs = note.getAttributes().filter((attr) => attr.noteId !== this.noteId);

        attrs.sort((a, b) => {
            if (a.noteId === b.noteId) {
                return a.position - b.position;
            } else {
                // inherited attributes should stay grouped: https://github.com/zadam/trilium/issues/3761
                return a.noteId < b.noteId ? -1 : 1;
            }
        });

        return attrs;
    }

    entitiesReloadedEvent({ loadResults }: EventData<"entitiesReloaded">) {
        if (loadResults.getAttributeRows(this.componentId).find((attr) => attributeService.isAffecting(attr, this.note))) {
            this.refresh();
        }
    }
}
