import server from "../../services/server.js";
import ws from "../../services/ws.js";
import Component from "../../components/component.js";
import utils from "../../services/utils.js";
import { t } from "../../services/i18n.js";
import type FAttribute from "../../entities/fattribute.js";
import type FNote from "../../entities/fnote.js";
import type { AttributeType } from "../../entities/fattribute.js";

export default abstract class AbstractSearchOption extends Component {

    private attribute: FAttribute;
    protected note: FNote;

    constructor(attribute: FAttribute, note: FNote) {
        super();

        this.attribute = attribute;
        this.note = note;
    }

    static async setAttribute(noteId: string, type: AttributeType, name: string, value: string = "") {
        await server.put(`notes/${noteId}/set-attribute`, { type, name, value });

        await ws.waitForMaxKnownEntityChangeId();
    }

    async setAttribute(type: AttributeType, name: string, value: string = "") {
        // TODO: Find a better pattern.
        await (this.constructor as any).setAttribute(this.note.noteId, type, name, value);
    }

    render() {
        try {
            const $rendered = this.doRender();

            $rendered
                .find(".search-option-del")
                .on("click", () => this.deleteOption())
                .attr("title", t("abstract_search_option.remove_this_search_option"));

            utils.initHelpDropdown($rendered);

            return $rendered;
        } catch (e: any) {
            logError(t("abstract_search_option.failed_rendering", { dto: JSON.stringify(this.attribute.dto), error: e.message, stack: e.stack }));
            return null;
        }
    }

    abstract doRender(): JQuery<HTMLElement>;

    async deleteOption() {
        // TODO: Find a better pattern.
        await this.deleteAttribute((this.constructor as any).attributeType, (this.constructor as any).optionName);

        await ws.waitForMaxKnownEntityChangeId();

        await this.triggerCommand("refreshSearchDefinition");
    }

    async deleteAttribute(type: AttributeType, name: string) {
        for (const attr of this.note.getOwnedAttributes()) {
            if (attr.type === type && attr.name === name) {
                await server.remove(`notes/${this.note.noteId}/attributes/${attr.attributeId}`);
            }
        }
    }
}
