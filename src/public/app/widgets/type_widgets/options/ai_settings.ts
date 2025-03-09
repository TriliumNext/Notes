import OptionsWidget from "./options_widget.js";
import { t } from "../../../services/i18n.js";
import type { FilterOptionsByType, OptionMap } from "../../../../../services/options_interface.js";
import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";

// Interface for the Ollama model response
interface OllamaModelResponse {
    success: boolean;
    models: Array<{
        name: string;
        model: string;
        details?: {
            family?: string;
            parameter_size?: string;
        }
    }>;
}

// Interface for embedding statistics
interface EmbeddingStats {
    success: boolean;
    stats: {
        totalNotesCount: number;
        embeddedNotesCount: number;
        queuedNotesCount: number;
        failedNotesCount: number;
        lastProcessedDate: string | null;
        percentComplete: number;
    }
}

export default class AiSettingsWidget extends OptionsWidget {
    private statsRefreshInterval: NodeJS.Timeout | null = null;
    private readonly STATS_REFRESH_INTERVAL = 5000; // 5 seconds

    doRender() {
        this.$widget = $(`
        <div class="options-section">
            <h4>${t("ai_llm.title")}</h4>

            <div class="form-group">
                <label>
                    <input class="ai-enabled" type="checkbox">
                    ${t("ai_llm.enable_ai_features")}
                </label>
                <div class="help-text">${t("ai_llm.enable_ai_description")}</div>
            </div>

            <hr />

            <div class="ai-providers-section">
                <h5>${t("ai_llm.provider_configuration")}</h5>

                <div class="form-group">
                    <label>${t("ai_llm.provider_precedence")}</label>
                    <input class="ai-provider-precedence form-control" type="text">
                    <div class="help-text">${t("ai_llm.provider_precedence_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.temperature")}</label>
                    <input class="ai-temperature form-control" type="number" min="0" max="2" step="0.1">
                    <div class="help-text">${t("ai_llm.temperature_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.system_prompt")}</label>
                    <textarea class="ai-system-prompt form-control" rows="3"></textarea>
                    <div class="help-text">${t("ai_llm.system_prompt_description")}</div>
                </div>
            </div>

            <hr />

            <div class="ai-provider">
                <h5>${t("ai_llm.openai_configuration")}</h5>

                <div class="form-group">
                    <label>${t("ai_llm.api_key")}</label>
                    <input class="openai-api-key form-control" type="password">
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.default_model")}</label>
                    <input class="openai-default-model form-control" type="text">
                    <div class="help-text">${t("ai_llm.openai_model_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.base_url")}</label>
                    <input class="openai-base-url form-control" type="text">
                    <div class="help-text">${t("ai_llm.openai_url_description")}</div>
                </div>
            </div>

            <hr />

            <div class="ai-provider">
                <h5>${t("ai_llm.anthropic_configuration")}</h5>

                <div class="form-group">
                    <label>${t("ai_llm.api_key")}</label>
                    <input class="anthropic-api-key form-control" type="password">
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.default_model")}</label>
                    <input class="anthropic-default-model form-control" type="text">
                    <div class="help-text">${t("ai_llm.anthropic_model_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.base_url")}</label>
                    <input class="anthropic-base-url form-control" type="text">
                    <div class="help-text">${t("ai_llm.anthropic_url_description")}</div>
                </div>
            </div>

            <hr />

            <div class="ai-provider">
                <h5>${t("ai_llm.ollama_configuration")}</h5>

                <div class="form-group">
                    <label>
                        <input class="ollama-enabled" type="checkbox">
                        ${t("ai_llm.enable_ollama")}
                    </label>
                    <div class="help-text">${t("ai_llm.enable_ollama_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.ollama_url")}</label>
                    <input class="ollama-base-url form-control" type="text">
                    <div class="help-text">${t("ai_llm.ollama_url_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.ollama_model")}</label>
                    <input class="ollama-default-model form-control" type="text">
                    <div class="help-text">${t("ai_llm.ollama_model_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.ollama_embedding_model")}</label>
                    <select class="ollama-embedding-model form-control">
                        <option value="nomic-embed-text">nomic-embed-text (recommended)</option>
                        <option value="mxbai-embed-large">mxbai-embed-large</option>
                        <option value="llama3">llama3</option>
                    </select>
                    <div class="help-text">${t("ai_llm.ollama_embedding_model_description")}</div>
                    <button class="btn btn-sm btn-outline-secondary refresh-models">${t("ai_llm.refresh_models")}</button>
                </div>
            </div>

            <hr />

            <div class="embedding-section">
                <h5>${t("ai_llm.embedding_configuration")}</h5>

                <div class="form-group">
                    <label>${t("ai_llm.embedding_default_provider")}</label>
                    <select class="embedding-default-provider form-control">
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                        <option value="ollama">Ollama</option>
                        <option value="local">Local</option>
                    </select>
                    <div class="help-text">${t("ai_llm.embedding_default_provider_description")}</div>
                </div>

                <div class="form-group">
                    <label>
                        <input class="embedding-auto-update-enabled" type="checkbox">
                        ${t("ai_llm.enable_auto_update_embeddings")}
                    </label>
                    <div class="help-text">${t("ai_llm.enable_auto_update_embeddings_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.embedding_batch_size")}</label>
                    <input class="embedding-batch-size form-control" type="number" min="1" max="50">
                    <div class="help-text">${t("ai_llm.embedding_batch_size_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.embedding_update_interval")}</label>
                    <input class="embedding-update-interval form-control" type="number" min="1000" step="1000">
                    <div class="help-text">${t("ai_llm.embedding_update_interval_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.embedding_default_dimension")}</label>
                    <input class="embedding-default-dimension form-control" type="number" min="128">
                    <div class="help-text">${t("ai_llm.embedding_default_dimension_description")}</div>
                </div>

                <div class="form-group">
                    <button class="btn btn-sm btn-primary embedding-reprocess-all">
                        ${t("ai_llm.reprocess_all_embeddings")}
                    </button>
                    <div class="help-text">${t("ai_llm.reprocess_all_embeddings_description")}</div>
                </div>

                <div class="form-group">
                    <label>${t("ai_llm.embedding_statistics")}</label>
                    <div class="embedding-stats-container">
                        <div class="embedding-stats">
                            <div><strong>${t("ai_llm.total_notes")}:</strong> <span class="embedding-total-notes">-</span></div>
                            <div><strong>${t("ai_llm.processed_notes")}:</strong> <span class="embedding-processed-notes">-</span></div>
                            <div><strong>${t("ai_llm.queued_notes")}:</strong> <span class="embedding-queued-notes">-</span></div>
                            <div><strong>${t("ai_llm.failed_notes")}:</strong> <span class="embedding-failed-notes">-</span></div>
                            <div><strong>${t("ai_llm.last_processed")}:</strong> <span class="embedding-last-processed">-</span></div>
                            <div class="mt-2">
                                <strong>${t("ai_llm.progress")}:</strong> <span class="embedding-status-text">-</span>
                            </div>
                            <div class="progress mt-1" style="height: 10px;">
                                <div class="progress-bar embedding-progress" role="progressbar" style="width: 0%;"
                                    aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                            </div>
                        </div>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-secondary embedding-refresh-stats">
                                ${t("ai_llm.refresh_stats")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`);

        const $aiEnabled = this.$widget.find('.ai-enabled');
        $aiEnabled.on('change', async () => {
            await this.updateOption('aiEnabled', $aiEnabled.prop('checked') ? "true" : "false");
            this.updateAiSectionVisibility();
        });

        const $ollamaEnabled = this.$widget.find('.ollama-enabled');
        $ollamaEnabled.on('change', async () => {
            await this.updateOption('ollamaEnabled', $ollamaEnabled.prop('checked') ? "true" : "false");
        });

        const $aiProviderPrecedence = this.$widget.find('.ai-provider-precedence');
        $aiProviderPrecedence.on('change', async () => {
            await this.updateOption('aiProviderPrecedence', $aiProviderPrecedence.val() as string);
        });

        const $aiTemperature = this.$widget.find('.ai-temperature');
        $aiTemperature.on('change', async () => {
            await this.updateOption('aiTemperature', $aiTemperature.val() as string);
        });

        const $aiSystemPrompt = this.$widget.find('.ai-system-prompt');
        $aiSystemPrompt.on('change', async () => {
            await this.updateOption('aiSystemPrompt', $aiSystemPrompt.val() as string);
        });

        const $openaiApiKey = this.$widget.find('.openai-api-key');
        $openaiApiKey.on('change', async () => {
            await this.updateOption('openaiApiKey', $openaiApiKey.val() as string);
        });

        const $openaiDefaultModel = this.$widget.find('.openai-default-model');
        $openaiDefaultModel.on('change', async () => {
            await this.updateOption('openaiDefaultModel', $openaiDefaultModel.val() as string);
        });

        const $openaiBaseUrl = this.$widget.find('.openai-base-url');
        $openaiBaseUrl.on('change', async () => {
            await this.updateOption('openaiBaseUrl', $openaiBaseUrl.val() as string);
        });

        const $anthropicApiKey = this.$widget.find('.anthropic-api-key');
        $anthropicApiKey.on('change', async () => {
            await this.updateOption('anthropicApiKey', $anthropicApiKey.val() as string);
        });

        const $anthropicDefaultModel = this.$widget.find('.anthropic-default-model');
        $anthropicDefaultModel.on('change', async () => {
            await this.updateOption('anthropicDefaultModel', $anthropicDefaultModel.val() as string);
        });

        const $anthropicBaseUrl = this.$widget.find('.anthropic-base-url');
        $anthropicBaseUrl.on('change', async () => {
            await this.updateOption('anthropicBaseUrl', $anthropicBaseUrl.val() as string);
        });

        const $ollamaBaseUrl = this.$widget.find('.ollama-base-url');
        $ollamaBaseUrl.on('change', async () => {
            await this.updateOption('ollamaBaseUrl', $ollamaBaseUrl.val() as string);
        });

        const $ollamaDefaultModel = this.$widget.find('.ollama-default-model');
        $ollamaDefaultModel.on('change', async () => {
            await this.updateOption('ollamaDefaultModel', $ollamaDefaultModel.val() as string);
        });

        const $ollamaEmbeddingModel = this.$widget.find('.ollama-embedding-model');
        $ollamaEmbeddingModel.on('change', async () => {
            await this.updateOption('ollamaEmbeddingModel', $ollamaEmbeddingModel.val() as string);
        });

        const $refreshModels = this.$widget.find('.refresh-models');
        $refreshModels.on('click', async () => {
            $refreshModels.prop('disabled', true);
            $refreshModels.text(t("ai_llm.refreshing_models"));

            try {
                const ollamaBaseUrl = this.$widget.find('.ollama-base-url').val() as string;
                const response = await server.post<OllamaModelResponse>('ollama/list-models', { baseUrl: ollamaBaseUrl });

                if (response && response.success && response.models && response.models.length > 0) {
                    const $embedModelSelect = this.$widget.find('.ollama-embedding-model');
                    const currentValue = $embedModelSelect.val();

                    // Clear existing options
                    $embedModelSelect.empty();

                    // Add embedding-specific models first
                    const embeddingModels = response.models.filter(model =>
                        model.name.includes('embed') || model.name.includes('bert'));

                    embeddingModels.forEach(model => {
                        $embedModelSelect.append(`<option value="${model.name}">${model.name}</option>`);
                    });

                    // Add separator if we have both types
                    if (embeddingModels.length > 0) {
                        $embedModelSelect.append(`<option disabled>───────────</option>`);
                    }

                    // Add other models (LLMs can also generate embeddings)
                    const otherModels = response.models.filter(model =>
                        !model.name.includes('embed') && !model.name.includes('bert'));

                    otherModels.forEach(model => {
                        $embedModelSelect.append(`<option value="${model.name}">${model.name}</option>`);
                    });

                    // Restore previous selection if possible
                    if (currentValue) {
                        $embedModelSelect.val(currentValue);
                    }

                    toastService.showMessage("Models refreshed successfully");
                } else {
                    toastService.showError("No models found from Ollama server");
                }
            } catch (error: any) {
                console.error("Error refreshing Ollama models:", error);
                toastService.showError(`Error refreshing models: ${error.message || 'Unknown error'}`);
            } finally {
                $refreshModels.prop('disabled', false);
                $refreshModels.text(t("ai_llm.refresh_models"));
            }
        });

        // Embedding options event handlers
        const $embeddingAutoUpdateEnabled = this.$widget.find('.embedding-auto-update-enabled');
        $embeddingAutoUpdateEnabled.on('change', async () => {
            await this.updateOption('embeddingAutoUpdateEnabled', $embeddingAutoUpdateEnabled.prop('checked') ? "true" : "false");
        });

        const $embeddingDefaultProvider = this.$widget.find('.embedding-default-provider');
        $embeddingDefaultProvider.on('change', async () => {
            await this.updateOption('embeddingsDefaultProvider', $embeddingDefaultProvider.val() as string);
        });

        const $embeddingBatchSize = this.$widget.find('.embedding-batch-size');
        $embeddingBatchSize.on('change', async () => {
            await this.updateOption('embeddingBatchSize', $embeddingBatchSize.val() as string);
        });

        const $embeddingUpdateInterval = this.$widget.find('.embedding-update-interval');
        $embeddingUpdateInterval.on('change', async () => {
            await this.updateOption('embeddingUpdateInterval', $embeddingUpdateInterval.val() as string);
        });

        const $embeddingDefaultDimension = this.$widget.find('.embedding-default-dimension');
        $embeddingDefaultDimension.on('change', async () => {
            await this.updateOption('embeddingDefaultDimension', $embeddingDefaultDimension.val() as string);
        });

        const $embeddingReprocessAll = this.$widget.find('.embedding-reprocess-all');
        $embeddingReprocessAll.on('click', async () => {
            $embeddingReprocessAll.prop('disabled', true);
            $embeddingReprocessAll.text(t("ai_llm.reprocessing_embeddings"));

            try {
                await server.post('embeddings/reprocess');
                toastService.showMessage(t("ai_llm.reprocess_started"));
                // Refresh stats after reprocessing starts
                await this.refreshEmbeddingStats();
            } catch (error) {
                console.error("Error reprocessing embeddings:", error);
                toastService.showError(t("ai_llm.reprocess_error"));
            } finally {
                $embeddingReprocessAll.prop('disabled', false);
                $embeddingReprocessAll.text(t("ai_llm.reprocess_all_embeddings"));
            }
        });

        const $embeddingRefreshStats = this.$widget.find('.embedding-refresh-stats');
        $embeddingRefreshStats.on('click', async () => {
            await this.refreshEmbeddingStats();
        });

        // Initial fetch of embedding stats
        setTimeout(async () => {
            await this.refreshEmbeddingStats();
            // Start polling for stats updates
            this.startStatsPolling();
        }, 500);

        return this.$widget;
    }

    /**
     * Start automatic polling for embedding statistics
     */
    startStatsPolling() {
        // Clear any existing interval first
        this.stopStatsPolling();

        // Set up new polling interval
        this.statsRefreshInterval = setInterval(async () => {
            // Only refresh if this widget is still visible
            if (this.$widget && this.$widget.is(':visible') &&
                this.$widget.find('.embedding-section').is(':visible')) {
                await this.refreshEmbeddingStats(true);
            }
        }, this.STATS_REFRESH_INTERVAL);
    }

    /**
     * Stop automatic polling for embedding statistics
     */
    stopStatsPolling() {
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
        }
    }

    async refreshEmbeddingStats(silent = false) {
        if (!this.$widget) return;

        try {
            const $refreshButton = this.$widget.find('.embedding-refresh-stats');

            // Only update button state if not in silent mode
            if (!silent) {
                $refreshButton.prop('disabled', true);
                $refreshButton.text(t("ai_llm.refreshing"));
            }

            const response = await server.get<EmbeddingStats>('embeddings/stats');

            if (response && response.success) {
                const stats = response.stats;

                this.$widget.find('.embedding-total-notes').text(stats.totalNotesCount);
                this.$widget.find('.embedding-processed-notes').text(stats.embeddedNotesCount);
                this.$widget.find('.embedding-queued-notes').text(stats.queuedNotesCount);
                this.$widget.find('.embedding-failed-notes').text(stats.failedNotesCount);

                const lastProcessed = stats.lastProcessedDate
                    ? new Date(stats.lastProcessedDate).toLocaleString()
                    : t("ai_llm.never");
                this.$widget.find('.embedding-last-processed').text(lastProcessed);

                const $progressBar = this.$widget.find('.embedding-progress');
                $progressBar.css('width', `${stats.percentComplete}%`);
                $progressBar.attr('aria-valuenow', stats.percentComplete.toString());
                $progressBar.text(`${stats.percentComplete}%`);

                // Update status text based on state
                const $statusText = this.$widget.find('.embedding-status-text');
                if (stats.queuedNotesCount > 0) {
                    $statusText.text(t("ai_llm.processing", { percentage: stats.percentComplete }));
                } else if (stats.percentComplete < 100) {
                    $statusText.text(t("ai_llm.incomplete", { percentage: stats.percentComplete }));
                } else {
                    $statusText.text(t("ai_llm.complete"));
                }

                // Change progress bar color based on state
                if (stats.queuedNotesCount > 0) {
                    // Processing in progress - use animated progress bar
                    $progressBar.addClass('progress-bar-striped progress-bar-animated bg-info');
                    $progressBar.removeClass('bg-success');
                } else if (stats.percentComplete < 100) {
                    // Incomplete - use standard progress bar
                    $progressBar.removeClass('progress-bar-striped progress-bar-animated bg-info bg-success');
                } else {
                    // Complete - show success color
                    $progressBar.removeClass('progress-bar-striped progress-bar-animated bg-info');
                    $progressBar.addClass('bg-success');
                }
            }
        } catch (error) {
            console.error("Error fetching embedding stats:", error);
            if (!silent) {
                toastService.showError(t("ai_llm.stats_error"));
            }
        } finally {
            // Only update button state if not in silent mode
            if (!silent) {
                const $refreshButton = this.$widget.find('.embedding-refresh-stats');
                $refreshButton.prop('disabled', false);
                $refreshButton.text(t("ai_llm.refresh_stats"));
            }
        }
    }

    updateAiSectionVisibility() {
        if (!this.$widget) return;

        const aiEnabled = this.$widget.find('.ai-enabled').prop('checked');
        this.$widget.find('.ai-providers-section').toggle(aiEnabled);
        this.$widget.find('.ai-provider').toggle(aiEnabled);
        this.$widget.find('.embedding-section').toggle(aiEnabled);

        // Start or stop polling based on visibility
        if (aiEnabled && this.$widget.find('.embedding-section').is(':visible')) {
            this.startStatsPolling();
        } else {
            this.stopStatsPolling();
        }
    }

    // Clean up when the widget is removed
    cleanup() {
        this.stopStatsPolling();
        super.cleanup();
    }

    optionsLoaded(options: OptionMap) {
        if (!this.$widget) return;

        this.setCheckboxState(this.$widget.find('.ai-enabled'), options.aiEnabled);
        this.setCheckboxState(this.$widget.find('.ollama-enabled'), options.ollamaEnabled);

        this.$widget.find('.ai-provider-precedence').val(options.aiProviderPrecedence);
        this.$widget.find('.ai-temperature').val(options.aiTemperature);
        this.$widget.find('.ai-system-prompt').val(options.aiSystemPrompt);

        this.$widget.find('.openai-api-key').val(options.openaiApiKey);
        this.$widget.find('.openai-default-model').val(options.openaiDefaultModel);
        this.$widget.find('.openai-base-url').val(options.openaiBaseUrl);

        this.$widget.find('.anthropic-api-key').val(options.anthropicApiKey);
        this.$widget.find('.anthropic-default-model').val(options.anthropicDefaultModel);
        this.$widget.find('.anthropic-base-url').val(options.anthropicBaseUrl);

        this.$widget.find('.ollama-base-url').val(options.ollamaBaseUrl);
        this.$widget.find('.ollama-default-model').val(options.ollamaDefaultModel);
        this.$widget.find('.ollama-embedding-model').val(options.ollamaEmbeddingModel || 'nomic-embed-text');

        // Load embedding options
        this.$widget.find('.embedding-default-provider').val(options.embeddingsDefaultProvider || 'openai');
        this.setCheckboxState(this.$widget.find('.embedding-auto-update-enabled'), options.embeddingAutoUpdateEnabled);
        this.$widget.find('.embedding-batch-size').val(options.embeddingBatchSize);
        this.$widget.find('.embedding-update-interval').val(options.embeddingUpdateInterval);
        this.$widget.find('.embedding-default-dimension').val(options.embeddingDefaultDimension);

        this.updateAiSectionVisibility();
    }
}
