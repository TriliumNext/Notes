import { t } from "../services/i18n.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import NoteListRenderer from "../services/note_list_renderer.js";

const TPL = `
<div class="search-result-widget">
    <style>
    .search-result-widget {
        flex-grow: 100000;
        flex-shrink: 100000;
        min-height: 0;
        overflow: auto;
    }
    
    .search-result-widget .note-list {
        padding: 10px;
    }
    
    .search-no-results, .search-not-executed-yet {
        margin: 20px;
        padding: 20px;
    }
    </style>
    
    <div class="search-no-results alert alert-info">
        ${t('search_result.no_notes_found')}
    </div>
    
    <div class="search-not-executed-yet alert alert-info">
        ${t('search_result.search_not_executed')}
    </div>
    
    <div class="search-result-widget-content">
    </div>
</div>`;

export default class SearchResultWidget extends NoteContextAwareWidget {
    constructor() {
        super();
        this.page = 1;
        this.loading = false;
        this.hasMore = true;
        this.pageSize = 20;
    }

    isEnabled() {
        return super.isEnabled()
            && this.note.type === 'search';
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();
        this.$content = this.$widget.find('.search-result-widget-content');
        this.$noResults = this.$widget.find('.search-no-results');
        this.$notExecutedYet = this.$widget.find('.search-not-executed-yet');
        
        // Add scroll event listener for infinite scroll
        this.$widget.on('scroll', () => this.handleScroll());
    }

    handleScroll() {
        if (this.loading || !this.hasMore) return;

        const scrollHeight = this.$widget[0].scrollHeight;
        const scrollTop = this.$widget.scrollTop();
        const clientHeight = this.$widget[0].clientHeight;

        // Load more when user scrolls near bottom
        if (scrollTop + clientHeight > scrollHeight - 100) {
            this.loadMoreResults();
        }
    }

    async loadMoreResults() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.page += 1;

        const searchString = this.note.getLabelValue('searchString');
        const { results, hasMore } = await server.get(
            `search/${encodeURIComponent(searchString)}?page=${this.page}&pageSize=${this.pageSize}`
        );

        this.hasMore = hasMore;

        if (results.length > 0) {
            const noteListRenderer = new NoteListRenderer(
                this.$content, 
                this.note, 
                results,
                true
            );
            await noteListRenderer.renderList();
        }

        this.loading = false;
    }

    async refreshWithNote(note) {
        // Reset pagination state
        this.page = 1;
        this.hasMore = true;
        this.loading = false;

        this.$content.empty();
        this.$noResults.toggle(note.getChildNoteIds().length === 0 && !!note.searchResultsLoaded);
        this.$notExecutedYet.toggle(!note.searchResultsLoaded);

        const noteListRenderer = new NoteListRenderer(
            this.$content, 
            note, 
            note.getChildNoteIds(), 
            true
        );
        await noteListRenderer.renderList();
    }

    searchRefreshedEvent({ntxId}) {
        if (!this.isNoteContext(ntxId)) {
            return;
        }

        this.refresh();
    }

    notesReloadedEvent({noteIds}) {
        if (noteIds.includes(this.noteId)) {
            this.refresh();
        }
    }
}
