import AbstractSearchOption from "./abstract_search_option.js";
import SpacedUpdate from "../../services/spaced_update.js";
import server from "../../services/server.js";
import shortcutService from "../../services/shortcuts.js";
import appContext from "../../components/app_context.js";
import { t } from "../../services/i18n.js";

const TPL = `
<tr>
    <td class="title-column">${t('search_string.title_column')}</td>
    <td>
        <textarea class="form-control search-string" placeholder="${t('search_string.placeholder')}"></textarea>
    </td>
    <td class="button-column">
        <div class="dropdown help-dropdown">
          <span class="bx bx-help-circle icon-action" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></span>
          <div class="dropdown-menu dropdown-menu-right p-4">
            <strong>${t('search_string.search_syntax')}</strong> - ${t('search_string.also_see')} <button class="btn btn-sm" type="button" data-help-page="search.md">${t('search_string.complete_help')}</button>
            <p>
            <ul>
                <li>${t('search_string.full_text_search')}</li>
                <li><code>#abc</code> - ${t('search_string.label_abc')}</li>
                <li><code>#year = 2019</code> - ${t('search_string.label_year')}</li>
                <li><code>#rock #pop</code> - ${t('search_string.label_rock_pop')}</li>
                <li><code>#rock or #pop</code> - ${t('search_string.label_rock_or_pop')}</li>
                <li><code>#year &lt;= 2000</code> - ${t('search_string.label_year_comparison')}</li>
                <li><code>note.dateCreated >= MONTH-1</code> - ${t('search_string.label_date_created')}</li>
            </ul>
            </p>
          </div>
        </div>
        
        <span class="bx bx-x icon-action search-option-del"></span>
    </td>
</tr>`;

export default class SearchString extends AbstractSearchOption {
    static get optionName() { return "searchString" };
    static get attributeType() { return "label" };

    static async create(noteId) {
        await AbstractSearchOption.setAttribute(noteId, 'label', 'searchString');
    }

    doRender() {
        const $option = $(TPL);
        this.$searchString = $option.find('.search-string');
        this.$searchString.on('input', () => this.spacedUpdate.scheduleUpdate());

        shortcutService.bindElShortcut(this.$searchString, 'return', async () => {
            // this also in effect disallows new lines in query string.
            // on one hand, this makes sense since search string is a label
            // on the other hand, it could be nice for structuring long search string. It's probably a niche case though.
            await this.spacedUpdate.updateNowIfNecessary();

            this.triggerCommand('refreshResults');
        });

        this.spacedUpdate = new SpacedUpdate(async () => {
            const searchString = this.$searchString.val();
            appContext.lastSearchString = searchString;

            await this.setAttribute('label', 'searchString', searchString);

            if (this.note.title.startsWith('Search: ')) {
                await server.put(`notes/${this.note.noteId}/title`, {
                    title: `Search: ${searchString.length < 30 ? searchString : `${searchString.substr(0, 30)}…`}`
                });
            }
        }, 1000);

        this.$searchString.val(this.note.getLabelValue('searchString'));

        return $option;
    }

    showSearchErrorEvent({error}) {
        this.$searchString.tooltip({
            trigger: 'manual',
            title: `${t('search_string.error', {error})}`,
            placement: 'bottom'
        });

        this.$searchString.tooltip("show");

        setTimeout(() => this.$searchString.tooltip("dispose"), 4000);
    }

    focusOnSearchDefinitionEvent() {
        this.$searchString.val(this.$searchString.val().trim() || appContext.lastSearchString).focus().select();
        this.spacedUpdate.scheduleUpdate();
    }
}
