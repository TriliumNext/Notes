import AbstractSearchOption from "./abstract_search_option.js";
import noteAutocompleteService from "../../services/note_autocomplete.js";
import { t } from "../../services/i18n.js";

const TPL = `
<tr>
    <td class="title-column">
        ${t('search_script.title')}
    </td>
    <td>
        <div class="input-group">
            <input class="search-script form-control" placeholder="${t('search_script.placeholder')}">
        </div>
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
          <span class="bx bx-help-circle icon-action" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
          <div class="dropdown-menu dropdown-menu-right p-4">
            <p>${t('search_script.description1')}</p>
            
            <p>${t('search_script.description2')}</p>
            
            <p>${t('search_script.example_title')}</p>
            
            <pre>${t('search_script.example_code')}</pre>

            ${t('search_script.note')}
          </div>
        </div>
        
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class SearchScript extends AbstractSearchOption {
    static get optionName() { return "searchScript" };
    static get attributeType() { return "relation" };

    static async create(noteId) {
        await AbstractSearchOption.setAttribute(noteId, 'relation', 'searchScript', 'root');
    }

    doRender() {
        const $option = $(TPL);
        const $searchScript = $option.find('.search-script');
        noteAutocompleteService.initNoteAutocomplete($searchScript, {allowCreatingNotes: true});

        $searchScript.on('autocomplete:closed', async () => {
            const searchScriptNoteId = $searchScript.getSelectedNoteId();

            if (searchScriptNoteId) {
                await this.setAttribute('relation', 'searchScript', searchScriptNoteId);
            }
        });

        const searchScriptNoteId = this.note.getRelationValue('searchScript');

        if (searchScriptNoteId !== 'root') {
            $searchScript.setNote(searchScriptNoteId);
        }

        return $option;
    }
}
