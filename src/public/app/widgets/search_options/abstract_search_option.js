import server from "../../services/server.js";
import ws from "../../services/ws.js";
import Component from "../../components/component.js";
import utils from "../../services/utils.js";
import { t } from "../../services/i18n.js"; // 新增的导入

export default class AbstractSearchOption extends Component {
    constructor(attribute, note) {
        super();

        this.attribute = attribute;
        this.note = note;
    }

    static async setAttribute(noteId, type, name, value = '') {
        await server.put(`notes/${noteId}/set-attribute`, { type, name, value });

        await ws.waitForMaxKnownEntityChangeId();
    }

    async setAttribute(type, name, value = '') {
        await this.constructor.setAttribute(this.note.noteId, type, name, value);
    }

    render() {
        try {
            const $rendered = this.doRender();

            $rendered.find('.search-option-del')
                .on('click', () => this.deleteOption())
                .attr('title', t('abstract_search_option.remove_this_search_option')); // 使用 t 函数处理 i18n 字符串

            utils.initHelpDropdown($rendered);

            return $rendered;
        }
        catch (e) {
            logError(t('abstract_search_option.failed_rendering', { dto: JSON.stringify(this.attribute.dto), error: e.message, stack: e.stack })); // 使用 t 函数处理 i18n 字符串
            return null;
        }
    }

    // to be overridden
    doRender() {}

    async deleteOption() {
        await this.deleteAttribute(this.constructor.attributeType, this.constructor.optionName);

        await ws.waitForMaxKnownEntityChangeId();

        await this.triggerCommand('refreshSearchDefinition');
    }

    async deleteAttribute(type, name) {
        for (const attr of this.note.getOwnedAttributes()) {
            if (attr.type === type && attr.name === name) {
                await server.remove(`notes/${this.note.noteId}/attributes/${attr.attributeId}`);
            }
        }
    }
}
