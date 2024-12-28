import { t } from "../../services/i18n.js";
import server from "../../services/server.js";
import ws from "../../services/ws.js";
import utils from "../../services/utils.js";
import FAttribute from "../../entities/fattribute.js";

interface ActionDefinition {
    script: string;
    relationName: string;
    targetNoteId: string;
    targetParentNoteId: string;
    oldRelationName?: string;
    newRelationName?: string;
    newTitle?: string;
    labelName?: string;
    labelValue?: string;
    oldLabelName?: string;
    newLabelName?: string;
}

export default abstract class AbstractBulkAction {
    attribute: FAttribute;
    actionDef: ActionDefinition;

    constructor(attribute: FAttribute, actionDef: ActionDefinition) {
        this.attribute = attribute;
        this.actionDef = actionDef;
    }

    render() {
        try {
            const $rendered = this.doRender();

            $rendered.find('.action-conf-del')
                .on('click', () => this.deleteAction())
                .attr('title', t('abstract_bulk_action.remove_this_search_action'));

            utils.initHelpDropdown($rendered);

            return $rendered;
        } catch (e: any) {
            logError(`Failed rendering search action: ${JSON.stringify(this.attribute.dto)} with error: ${e.message} ${e.stack}`);
            return null;
        }
    }

    // to be overridden
    abstract doRender(): JQuery<HTMLElement>;
    static get actionName() { return ""; }

    async saveAction(data: {}) {
        const actionObject = Object.assign({ name: (this.constructor as typeof AbstractBulkAction).actionName }, data);

        await server.put(`notes/${this.attribute.noteId}/attribute`, {
            attributeId: this.attribute.attributeId,
            type: 'label',
            name: 'action',
            value: JSON.stringify(actionObject)
        });

        await ws.waitForMaxKnownEntityChangeId();
    }

    async deleteAction() {
        await server.remove(`notes/${this.attribute.noteId}/attributes/${this.attribute.attributeId}`);

        await ws.waitForMaxKnownEntityChangeId();

        //await this.triggerCommand('refreshSearchDefinition');
    }
}
