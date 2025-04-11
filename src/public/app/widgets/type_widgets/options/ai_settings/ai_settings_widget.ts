import OptionsWidget from "../options_widget.js";
import { TPL } from "./template.js";
import { t } from "../../../../services/i18n.js";
import type { OptionDefinitions, OptionMap } from "../../../../../../services/options_interface.js";
import server from "../../../../services/server.js";
import toastService from "../../../../services/toast.js";
import type { EmbeddingStats, FailedEmbeddingNotes } from "./interfaces.js";
import { ProviderService } from "./providers.js";

export default class AiSettingsWidget extends OptionsWidget {
    private ollamaModelsRefreshed = false;
    private openaiModelsRefreshed = false;
    private anthropicModelsRefreshed = false;
    private statsRefreshInterval: NodeJS.Timeout | null = null;
    private indexRebuildRefreshInterval: NodeJS.Timeout | null = null;
    private readonly STATS_REFRESH_INTERVAL = 5000; // 5 seconds
    private providerService: ProviderService | null = null;

    doRender() {
        this.$widget = $(TPL);
        this.providerService = new ProviderService(this.$widget);

        // Setup event handlers for options
        this.setupEventHandlers();

        this.refreshEmbeddingStats();
        this.fetchFailedEmbeddingNotes();

        return this.$widget;
    }

    /**
     * Helper method to set up a change event handler for an option
     * @param selector The jQuery selector for the element
     * @param optionName The name of the option to update
     * @param validateAfter Whether to run validation after the update
     * @param isCheckbox Whether the element is a checkbox
     */
    setupChangeHandler(selector: string, optionName: keyof OptionDefinitions, validateAfter: boolean = false, isCheckbox: boolean = false) {
        if (!this.$widget) return;

        const $element = this.$widget.find(selector);
        $element.on('change', async () => {
            let value: string;

            if (isCheckbox) {
                value = $element.prop('checked') ? 'true' : 'false';
            } else {
                value = $element.val() as string;
            }

            await this.updateOption(optionName, value);

            if (validateAfter) {
                await this.displayValidationWarnings();
            }
        });
    }

    /**
     * Set up all event handlers for options
     */
    setupEventHandlers() {
        if (!this.$widget) return;

        // Core AI options
        this.setupChangeHandler('.ai-enabled', 'aiEnabled', true, true);
        this.setupChangeHandler('.ai-provider-precedence', 'aiProviderPrecedence', true);
        this.setupChangeHandler('.ai-temperature', 'aiTemperature');
        this.setupChangeHandler('.ai-system-prompt', 'aiSystemPrompt');

        // OpenAI options
        this.setupChangeHandler('.openai-api-key', 'openaiApiKey', true);
        this.setupChangeHandler('.openai-base-url', 'openaiBaseUrl', true);
        this.setupChangeHandler('.openai-default-model', 'openaiDefaultModel');
        this.setupChangeHandler('.openai-embedding-model', 'openaiEmbeddingModel');

        // Anthropic options
        this.setupChangeHandler('.anthropic-api-key', 'anthropicApiKey', true);
        this.setupChangeHandler('.anthropic-default-model', 'anthropicDefaultModel');
        this.setupChangeHandler('.anthropic-base-url', 'anthropicBaseUrl');

        // Voyage options
        this.setupChangeHandler('.voyage-api-key', 'voyageApiKey');
        this.setupChangeHandler('.voyage-embedding-model', 'voyageEmbeddingModel');

        // Ollama options
        this.setupChangeHandler('.ollama-base-url', 'ollamaBaseUrl');
        this.setupChangeHandler('.ollama-default-model', 'ollamaDefaultModel');
        this.setupChangeHandler('.ollama-embedding-model', 'ollamaEmbeddingModel');

        const $refreshModels = this.$widget.find('.refresh-models');
        $refreshModels.on('click', async () => {
            this.ollamaModelsRefreshed = await this.providerService?.refreshOllamaModels(true, this.ollamaModelsRefreshed) || false;
        });

        // Add tab change handler for Ollama tab
        const $ollamaTab = this.$widget.find('#nav-ollama-tab');
        $ollamaTab.on('shown.bs.tab', async () => {
            // Only refresh the models if we haven't done it before
            this.ollamaModelsRefreshed = await this.providerService?.refreshOllamaModels(false, this.ollamaModelsRefreshed) || false;
        });

        // OpenAI models refresh button
        const $refreshOpenAIModels = this.$widget.find('.refresh-openai-models');
        $refreshOpenAIModels.on('click', async () => {
            this.openaiModelsRefreshed = await this.providerService?.refreshOpenAIModels(true, this.openaiModelsRefreshed) || false;
        });

        // Add tab change handler for OpenAI tab
        const $openaiTab = this.$widget.find('#nav-openai-tab');
        $openaiTab.on('shown.bs.tab', async () => {
            // Only refresh the models if we haven't done it before
            this.openaiModelsRefreshed = await this.providerService?.refreshOpenAIModels(false, this.openaiModelsRefreshed) || false;
        });

        // Anthropic models refresh button
        const $refreshAnthropicModels = this.$widget.find('.refresh-anthropic-models');
        $refreshAnthropicModels.on('click', async () => {
            this.anthropicModelsRefreshed = await this.providerService?.refreshAnthropicModels(true, this.anthropicModelsRefreshed) || false;
        });

        // Add tab change handler for Anthropic tab
        const $anthropicTab = this.$widget.find('#nav-anthropic-tab');
        $anthropicTab.on('shown.bs.tab', async () => {
            // Only refresh the models if we haven't done it before
            this.anthropicModelsRefreshed = await this.providerService?.refreshAnthropicModels(false, this.anthropicModelsRefreshed) || false;
        });

        // Embedding options event handlers
        this.setupChangeHandler('.embedding-auto-update-enabled', 'embeddingAutoUpdateEnabled', false, true);
        this.setupChangeHandler('.enable-automatic-indexing', 'enableAutomaticIndexing', false, true);
        this.setupChangeHandler('.embedding-similarity-threshold', 'embeddingSimilarityThreshold');
        this.setupChangeHandler('.max-notes-per-llm-query', 'maxNotesPerLlmQuery');
        this.setupChangeHandler('.embedding-provider-precedence', 'embeddingProviderPrecedence', true);
        this.setupChangeHandler('.embedding-dimension-strategy', 'embeddingDimensionStrategy');
        this.setupChangeHandler('.embedding-batch-size', 'embeddingBatchSize');
        this.setupChangeHandler('.embedding-update-interval', 'embeddingUpdateInterval');

        // No sortable behavior needed anymore

        // Embedding stats refresh button
        const $refreshStats = this.$widget.find('.embedding-refresh-stats');
        $refreshStats.on('click', async () => {
            await this.refreshEmbeddingStats();
            await this.fetchFailedEmbeddingNotes();
        });

        // Recreate embeddings button
        const $recreateEmbeddings = this.$widget.find('.recreate-embeddings');
        $recreateEmbeddings.on('click', async () => {
            if (confirm(t("ai_llm.recreate_embeddings_confirm") || "Are you sure you want to recreate all embeddings? This may take a long time.")) {
                try {
                    await server.post('llm/embeddings/reprocess');
                    toastService.showMessage(t("ai_llm.recreate_embeddings_started"));

                    // Start progress polling
                    this.pollIndexRebuildProgress();
                } catch (e) {
                    console.error('Error starting embeddings regeneration:', e);
                    toastService.showError(t("ai_llm.recreate_embeddings_error"));
                }
            }
        });

        // Rebuild index button
        const $rebuildIndex = this.$widget.find('.rebuild-embeddings-index');
        $rebuildIndex.on('click', async () => {
            try {
                await server.post('llm/embeddings/rebuild-index');
                toastService.showMessage(t("ai_llm.rebuild_index_started"));

                // Start progress polling
                this.pollIndexRebuildProgress();
            } catch (e) {
                console.error('Error starting index rebuild:', e);
                toastService.showError(t("ai_llm.rebuild_index_error"));
            }
        });
    }

    /**
     * Display warnings for validation issues with providers
     */
    async displayValidationWarnings() {
        if (!this.$widget) return;

        const $warningDiv = this.$widget.find('.provider-validation-warning');

        // Check if AI is enabled
        const aiEnabled = this.$widget.find('.ai-enabled').prop('checked');
        if (!aiEnabled) {
            $warningDiv.hide();
            return;
        }

        // Get provider precedence
        const providerPrecedence = (this.$widget.find('.ai-provider-precedence').val() as string || '').split(',');

        // Check for OpenAI configuration if it's in the precedence list
        const openaiWarnings = [];
        if (providerPrecedence.includes('openai')) {
            const openaiApiKey = this.$widget.find('.openai-api-key').val();
            if (!openaiApiKey) {
                openaiWarnings.push(t("ai_llm.empty_key_warning.openai"));
            }
        }

        // Check for Anthropic configuration if it's in the precedence list
        const anthropicWarnings = [];
        if (providerPrecedence.includes('anthropic')) {
            const anthropicApiKey = this.$widget.find('.anthropic-api-key').val();
            if (!anthropicApiKey) {
                anthropicWarnings.push(t("ai_llm.empty_key_warning.anthropic"));
            }
        }

        // Check for Voyage configuration if it's in the precedence list
        const voyageWarnings = [];
        if (providerPrecedence.includes('voyage')) {
            const voyageApiKey = this.$widget.find('.voyage-api-key').val();
            if (!voyageApiKey) {
                voyageWarnings.push(t("ai_llm.empty_key_warning.voyage"));
            }
        }

        // Check for Ollama configuration if it's in the precedence list
        const ollamaWarnings = [];
        if (providerPrecedence.includes('ollama')) {
            const ollamaBaseUrl = this.$widget.find('.ollama-base-url').val();
            if (!ollamaBaseUrl) {
                ollamaWarnings.push(t("ai_llm.ollama_no_url"));
            }
        }

        // Similar checks for embeddings
        const embeddingWarnings = [];
        const embeddingsEnabled = this.$widget.find('.enable-automatic-indexing').prop('checked');

        if (embeddingsEnabled) {
            const embeddingProviderPrecedence = (this.$widget.find('.embedding-provider-precedence').val() as string || '').split(',');

            if (embeddingProviderPrecedence.includes('openai') && !this.$widget.find('.openai-api-key').val()) {
                embeddingWarnings.push(t("ai_llm.empty_key_warning.openai"));
            }

            if (embeddingProviderPrecedence.includes('voyage') && !this.$widget.find('.voyage-api-key').val()) {
                embeddingWarnings.push(t("ai_llm.empty_key_warning.voyage"));
            }

            if (embeddingProviderPrecedence.includes('ollama') && !this.$widget.find('.ollama-base-url').val()) {
                embeddingWarnings.push(t("ai_llm.empty_key_warning.ollama"));
            }
        }

        // Combine all warnings
        const allWarnings = [
            ...openaiWarnings,
            ...anthropicWarnings,
            ...voyageWarnings,
            ...ollamaWarnings,
            ...embeddingWarnings
        ];

        // Show or hide warnings
        if (allWarnings.length > 0) {
            const warningHtml = '<strong>' + t("ai_llm.configuration_warnings") + '</strong><ul>' +
                allWarnings.map(warning => `<li>${warning}</li>`).join('') + '</ul>';
            $warningDiv.html(warningHtml).show();
        } else {
            $warningDiv.hide();
        }
    }

    /**
     * Poll for index rebuild progress
     */
    pollIndexRebuildProgress() {
        if (this.indexRebuildRefreshInterval) {
            clearInterval(this.indexRebuildRefreshInterval);
        }

        // Set up polling interval for index rebuild progress
        this.indexRebuildRefreshInterval = setInterval(async () => {
            await this.refreshEmbeddingStats();
        }, this.STATS_REFRESH_INTERVAL);

        // Stop polling after 5 minutes to avoid indefinite polling
        setTimeout(() => {
            if (this.indexRebuildRefreshInterval) {
                clearInterval(this.indexRebuildRefreshInterval);
                this.indexRebuildRefreshInterval = null;
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Refresh embedding statistics
     */
    async refreshEmbeddingStats() {
        if (!this.$widget) return;

        try {
            const response = await server.get<EmbeddingStats>('llm/embeddings/stats');

            if (response && response.success) {
                const stats = response.stats;

                // Update stats display
                this.$widget.find('.embedding-processed-notes').text(stats.embeddedNotesCount);
                this.$widget.find('.embedding-total-notes').text(stats.totalNotesCount);
                this.$widget.find('.embedding-queued-notes').text(stats.queuedNotesCount);
                this.$widget.find('.embedding-failed-notes').text(stats.failedNotesCount);

                if (stats.lastProcessedDate) {
                    const date = new Date(stats.lastProcessedDate);
                    this.$widget.find('.embedding-last-processed').text(date.toLocaleString());
                } else {
                    this.$widget.find('.embedding-last-processed').text('-');
                }

                // Update progress bar
                const $progressBar = this.$widget.find('.embedding-progress');
                const progressPercent = stats.percentComplete;
                $progressBar.css('width', `${progressPercent}%`);
                $progressBar.attr('aria-valuenow', progressPercent.toString());
                $progressBar.text(`${progressPercent}%`);

                // Update status text
                let statusText;
                if (stats.queuedNotesCount > 0) {
                    statusText = t("ai_llm.agent.processing", { percentage: progressPercent });
                } else if (stats.embeddedNotesCount === 0) {
                    statusText = t("ai_llm.not_started");
                } else if (stats.embeddedNotesCount === stats.totalNotesCount) {
                    statusText = t("ai_llm.complete");

                    // Clear polling interval if processing is complete
                    if (this.indexRebuildRefreshInterval) {
                        clearInterval(this.indexRebuildRefreshInterval);
                        this.indexRebuildRefreshInterval = null;
                    }
                } else {
                    statusText = t("ai_llm.partial", { percentage: progressPercent });
                }

                this.$widget.find('.embedding-status-text').text(statusText);
            }
        } catch (e) {
            console.error('Error fetching embedding stats:', e);
        }
    }

    /**
     * Fetch failed embedding notes
     */
    async fetchFailedEmbeddingNotes() {
        if (!this.$widget) return;

        try {
            const response = await server.get<FailedEmbeddingNotes>('llm/embeddings/failed');

            if (response && response.success) {
                const failedNotes = response.failedNotes || [];
                const $failedNotesList = this.$widget.find('.embedding-failed-notes-list');

                if (failedNotes.length === 0) {
                    $failedNotesList.html(`<div class="alert alert-info">${t("ai_llm.no_failed_embeddings")}</div>`);
                    return;
                }

                // Create a table with failed notes
                let html = `
                <table class="table table-sm table-striped">
                    <thead>
                        <tr>
                            <th>${t("ai_llm.note_title")}</th>
                            <th>${t("ai_llm.error")}</th>
                            <th>${t("ai_llm.last_attempt")}</th>
                            <th>${t("ai_llm.actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                `;

                for (const note of failedNotes) {
                    const date = new Date(note.lastAttempt);
                    const isPermanent = note.isPermanent;
                    const noteTitle = note.title || note.noteId;

                    html += `
                    <tr data-note-id="${note.noteId}">
                        <td><a href="#" class="open-note">${noteTitle}</a></td>
                        <td>${note.error}</td>
                        <td>${date.toLocaleString()}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-secondary retry-embedding" ${isPermanent ? 'disabled' : ''}>
                                ${t("ai_llm.retry")}
                            </button>
                        </td>
                    </tr>
                    `;
                }

                html += `
                    </tbody>
                </table>
                `;

                $failedNotesList.html(html);

                // Add event handlers for retry buttons
                $failedNotesList.find('.retry-embedding').on('click', async function() {
                    const noteId = $(this).closest('tr').data('note-id');
                    try {
                        await server.post('llm/embeddings/retry', { noteId });
                        toastService.showMessage(t("ai_llm.retry_queued"));
                        // Remove this row or update status
                        $(this).closest('tr').remove();
                    } catch (e) {
                        console.error('Error retrying embedding:', e);
                        toastService.showError(t("ai_llm.retry_failed"));
                    }
                });

                // Add event handlers for open note links
                $failedNotesList.find('.open-note').on('click', function(e) {
                    e.preventDefault();
                    const noteId = $(this).closest('tr').data('note-id');
                    window.open(`#${noteId}`, '_blank');
                });
            }
        } catch (e) {
            console.error('Error fetching failed embedding notes:', e);
        }
    }

    /**
     * Helper to get display name for providers
     */
    getProviderDisplayName(provider: string): string {
        switch(provider) {
            case 'openai': return 'OpenAI';
            case 'anthropic': return 'Anthropic';
            case 'ollama': return 'Ollama';
            case 'voyage': return 'Voyage';
            case 'local': return 'Local';
            default: return provider.charAt(0).toUpperCase() + provider.slice(1);
        }
    }

    /**
     * Called when the options have been loaded from the server
     */
    optionsLoaded(options: OptionMap) {
        if (!this.$widget) return;

        // AI Options
        this.$widget.find('.ai-enabled').prop('checked', options.aiEnabled !== 'false');
        this.$widget.find('.ai-temperature').val(options.aiTemperature || '0.7');
        this.$widget.find('.ai-system-prompt').val(options.aiSystemPrompt || '');
        this.$widget.find('.ai-provider-precedence').val(options.aiProviderPrecedence || 'openai,anthropic,ollama');

        // OpenAI Section
        this.$widget.find('.openai-api-key').val(options.openaiApiKey || '');
        this.$widget.find('.openai-base-url').val(options.openaiBaseUrl || 'https://api.openai_llm.com/v1');
        this.$widget.find('.openai-default-model').val(options.openaiDefaultModel || 'gpt-4o');
        this.$widget.find('.openai-embedding-model').val(options.openaiEmbeddingModel || 'text-embedding-3-small');

        // Anthropic Section
        this.$widget.find('.anthropic-api-key').val(options.anthropicApiKey || '');
        this.$widget.find('.anthropic-base-url').val(options.anthropicBaseUrl || 'https://api.anthropic.com');
        this.$widget.find('.anthropic-default-model').val(options.anthropicDefaultModel || 'claude-3-opus-20240229');

        // Voyage Section
        this.$widget.find('.voyage-api-key').val(options.voyageApiKey || '');
        this.$widget.find('.voyage-embedding-model').val(options.voyageEmbeddingModel || 'voyage-2');

        // Ollama Section
        this.$widget.find('.ollama-base-url').val(options.ollamaBaseUrl || 'http://localhost:11434');
        this.$widget.find('.ollama-default-model').val(options.ollamaDefaultModel || 'llama3');
        this.$widget.find('.ollama-embedding-model').val(options.ollamaEmbeddingModel || 'nomic-embed-text');

        // Embedding Options
        this.$widget.find('.embedding-provider-precedence').val(options.embeddingProviderPrecedence || 'openai,voyage,ollama,local');
        this.$widget.find('.embedding-auto-update-enabled').prop('checked', options.embeddingAutoUpdateEnabled !== 'false');
        this.$widget.find('.enable-automatic-indexing').prop('checked', options.enableAutomaticIndexing !== 'false');
        this.$widget.find('.embedding-similarity-threshold').val(options.embeddingSimilarityThreshold || '0.75');
        this.$widget.find('.max-notes-per-llm-query').val(options.maxNotesPerLlmQuery || '3');
        this.$widget.find('.embedding-dimension-strategy').val(options.embeddingDimensionStrategy || 'auto');
        this.$widget.find('.embedding-batch-size').val(options.embeddingBatchSize || '10');
        this.$widget.find('.embedding-update-interval').val(options.embeddingUpdateInterval || '5000');

        // Display validation warnings
        this.displayValidationWarnings();
    }

    cleanup() {
        // Clear intervals
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
        }

        if (this.indexRebuildRefreshInterval) {
            clearInterval(this.indexRebuildRefreshInterval);
            this.indexRebuildRefreshInterval = null;
        }
    }
}
