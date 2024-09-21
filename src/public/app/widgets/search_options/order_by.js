import AbstractSearchOption from "./abstract_search_option.js";
import { t } from "../../services/i18n.js";

const TPL = `
<tr data-search-option-conf="orderBy">
    <td class="title-column">
        <span class="bx bx-arrow-from-top"></span>
        ${t('order_by.order_by')}
    </td>
    <td>
        <select name="orderBy" class="form-control w-auto d-inline">
            <option value="relevancy">${t('order_by.relevancy')}</option>
            <option value="title">${t('order_by.title')}</option>
            <option value="dateCreated">${t('order_by.date_created')}</option>
            <option value="dateModified">${t('order_by.date_modified')}</option>
            <option value="contentSize">${t('order_by.content_size')}</option>
            <option value="contentAndAttachmentsSize">${t('order_by.content_and_attachments_size')}</option>
            <option value="contentAndAttachmentsAndRevisionsSize">${t('order_by.content_and_attachments_and_revisions_size')}</option>
            <option value="revisionCount">${t('order_by.revision_count')}</option>
            <option value="childrenCount">${t('order_by.children_count')}</option>
            <option value="parentCount">${t('order_by.parent_count')}</option>
            <option value="ownedLabelCount">${t('order_by.owned_label_count')}</option>
            <option value="ownedRelationCount">${t('order_by.owned_relation_count')}</option>
            <option value="targetRelationCount">${t('order_by.target_relation_count')}</option>
            <option value="random">${t('order_by.random')}</option>
        </select>
        
        <select name="orderDirection" class="form-control w-auto d-inline">
            <option value="asc">${t('order_by.asc')}</option>
            <option value="desc">${t('order_by.desc')}</option>
        </select>
    </td>
    <td class="button-column">
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class OrderBy extends AbstractSearchOption {
    static get optionName() { return "orderBy" };
    static get attributeType() { return "label" };

    static async create(noteId) {
        await AbstractSearchOption.setAttribute(noteId, 'label', 'orderBy', 'relevancy');
        await AbstractSearchOption.setAttribute(noteId, 'label', 'orderDirection', 'asc');
    }

    doRender() {
        const $option = $(TPL);

        const $orderBy = $option.find('select[name=orderBy]');
        $orderBy.on('change', async () => {
            const orderBy = $orderBy.val();

            await this.setAttribute('label', 'orderBy', orderBy);
        });
        $orderBy.val(this.note.getLabelValue('orderBy'));

        const $orderDirection = $option.find('select[name=orderDirection]');
        $orderDirection.on('change', async () => {
            const orderDirection = $orderDirection.val();

            await this.setAttribute('label', 'orderDirection', orderDirection);
        });
        $orderDirection.val(this.note.getLabelValue('orderDirection') || 'asc');

        return $option;
    }

    async deleteOption() {
        await this.deleteAttribute('label', 'orderDirection');

        await super.deleteOption();
    }
}
