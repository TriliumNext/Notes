import AbstractSearchOption from "./abstract_search_option.js";
import noteAutocompleteService from "../../services/note_autocomplete.js";
import { t } from "../../services/i18n.js";

const TPL = `
<tr>
    <td colspan="2">
        <div style="display: flex; align-items: center;">
            <div style="margin-right: 10px">${t('ancestor.label')}:</div> 
            <div class="input-group" style="flex-shrink: 2">
                <input class="ancestor form-control" placeholder="${t('ancestor.placeholder')}">
            </div>
            
            <div style="margin-left: 10px; margin-right: 10px">${t('ancestor.depth_label')}:</div>
            
            <select name="depth" class="form-select d-inline ancestor-depth" style="flex-shrink: 3">
                <option value="">${t('ancestor.depth_doesnt_matter')}</option>
                <option value="eq1">${t('ancestor.depth_eq', {count: 1})} (${t('ancestor.direct_children')})</option>
                <option value="eq2">${t('ancestor.depth_eq', {count: 2})}</option>
                <option value="eq3">${t('ancestor.depth_eq', {count: 3})}</option>
                <option value="eq4">${t('ancestor.depth_eq', {count: 4})}</option>
                <option value="eq5">${t('ancestor.depth_eq', {count: 5})}</option>
                <option value="eq6">${t('ancestor.depth_eq', {count: 6})}</option>
                <option value="eq7">${t('ancestor.depth_eq', {count: 7})}</option>
                <option value="eq8">${t('ancestor.depth_eq', {count: 8})}</option>
                <option value="eq9">${t('ancestor.depth_eq', {count: 9})}</option>
                <option value="gt0">${t('ancestor.depth_gt', {count: 0})}</option>
                <option value="gt1">${t('ancestor.depth_gt', {count: 1})}</option>
                <option value="gt2">${t('ancestor.depth_gt', {count: 2})}</option>
                <option value="gt3">${t('ancestor.depth_gt', {count: 3})}</option>
                <option value="gt4">${t('ancestor.depth_gt', {count: 4})}</option>
                <option value="gt5">${t('ancestor.depth_gt', {count: 5})}</option>
                <option value="gt6">${t('ancestor.depth_gt', {count: 6})}</option>
                <option value="gt7">${t('ancestor.depth_gt', {count: 7})}</option>
                <option value="gt8">${t('ancestor.depth_gt', {count: 8})}</option>
                <option value="gt9">${t('ancestor.depth_gt', {count: 9})}</option>
                <option value="lt2">${t('ancestor.depth_lt', {count: 2})}</option>
                <option value="lt3">${t('ancestor.depth_lt', {count: 3})}</option>
                <option value="lt4">${t('ancestor.depth_lt', {count: 4})}</option>
                <option value="lt5">${t('ancestor.depth_lt', {count: 5})}</option>
                <option value="lt6">${t('ancestor.depth_lt', {count: 6})}</option>
                <option value="lt7">${t('ancestor.depth_lt', {count: 7})}</option>
                <option value="lt8">${t('ancestor.depth_lt', {count: 8})}</option>
                <option value="lt9">${t('ancestor.depth_lt', {count: 9})}</option>
            </select>
        </div>
    </td>
    <td class="button-column">
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class Ancestor extends AbstractSearchOption {
    static get optionName() { return "ancestor" };
    static get attributeType() { return "relation" };

    static async create(noteId) {
        await AbstractSearchOption.setAttribute(noteId, 'relation', 'ancestor', 'root');
    }

    doRender() {
        const $option = $(TPL);
        const $ancestor = $option.find('.ancestor');
        const $ancestorDepth = $option.find('.ancestor-depth');
        noteAutocompleteService.initNoteAutocomplete($ancestor);

        $ancestor.on('autocomplete:closed', async () => {
            const ancestorNoteId = $ancestor.getSelectedNoteId();

            if (ancestorNoteId) {
                await this.setAttribute('relation', 'ancestor', ancestorNoteId);
            }
        });

        $ancestorDepth.on('change', async () => {
            const ancestorDepth = $ancestorDepth.val();

            if (ancestorDepth) {
                await this.setAttribute('label', 'ancestorDepth', ancestorDepth);
            }
            else {
                await this.deleteAttribute('label', 'ancestorDepth');
            }
        });

        const ancestorNoteId = this.note.getRelationValue('ancestor');

        if (ancestorNoteId !== 'root') {
            $ancestor.setNote(ancestorNoteId);
        }

        const ancestorDepth = this.note.getLabelValue('ancestorDepth');

        if (ancestorDepth) {
            $ancestorDepth.val(ancestorDepth);
        }

        return $option;
    }

    async deleteOption() {
        await this.deleteAttribute('label', 'ancestorDepth');

        await super.deleteOption();
    }
}
