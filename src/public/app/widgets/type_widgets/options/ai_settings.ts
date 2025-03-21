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

// Interface for failed embedding notes
interface FailedEmbeddingNotes {
    success: boolean;
    failedNotes: Array<{
        noteId: string;
        title?: string;
        operation: string;
        attempts: number;
        lastAttempt: string;
        error: string;
        failureType: string;
        chunks: number;
        isPermanent: boolean;
    }>;
}

interface OpenAIModelResponse {
    success: boolean;
    chatModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    embeddingModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
}

interface AnthropicModelResponse {
    success: boolean;
    chatModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
    embeddingModels: Array<{
        id: string;
        name: string;
        type: string;
    }>;
}

export default class AiSettingsWidget extends OptionsWidget {
    private statsRefreshInterval: NodeJS.Timeout | null = null;
    private indexRebuildRefreshInterval: NodeJS.Timeout | null = null;
    private readonly STATS_REFRESH_INTERVAL = 5000; // 5 seconds

    doRender() {
        this.$widget = $(`
        <div class="options-section">
            <h4>${t("ai_llm.title")}</h4>

            <!-- Add warning alert div -->
            <div class="provider-validation-warning alert alert-warning" style="display: none;"></div>

            <div class="form-group">
                <label class="tn-checkbox">
                    <input class="ai-enabled form-check-input" type="checkbox">
                    ${t("ai_llm.enable_ai_features")}
                </label>
                <div class="form-text">${t("ai_llm.enable_ai_description")}</div>
            </div>
        </div>

        <div class="options-section">
            <h4>${t("ai_llm.embedding_statistics")}</h4>
            <div class="embedding-stats-container">
                <div class="embedding-stats">
                    <div class="row">
                        <div class="col-md-6">
                            <div><strong>${t("ai_llm.processed_notes")}:</strong> <span class="embedding-processed-notes">-</span></div>
                            <div><strong>${t("ai_llm.total_notes")}:</strong> <span class="embedding-total-notes">-</span></div>
                            <div><strong>${t("ai_llm.progress")}:</strong> <span class="embedding-status-text">-</span></div>
                        </div>

                        <div class="col-md-6">
                            <div><strong>${t("ai_llm.queued_notes")}:</strong> <span class="embedding-queued-notes">-</span></div>
                            <div><strong>${t("ai_llm.failed_notes")}:</strong> <span class="embedding-failed-notes">-</span></div>
                            <div><strong>${t("ai_llm.last_processed")}:</strong> <span class="embedding-last-processed">-</span></div>
                        </div>
                    </div>
                </div>
                <div class="progress mt-1" style="height: 10px;">
                    <div class="progress-bar embedding-progress" role="progressbar" style="width: 0%;"
                        aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                </div>
                <div class="mt-2">
                    <button class="btn btn-sm btn-outline-secondary embedding-refresh-stats">
                        ${t("ai_llm.refresh_stats")}
                    </button>
                </div>
            </div>

            <hr/>
            <!-- Failed embeddings section -->
            <h5>${t("ai_llm.failed_notes")}</h4>
            <div class="form-group mt-4">
                <div class="embedding-failed-notes-container">
                    <div class="embedding-failed-notes-list">
                        <div class="alert alert-info">${t("ai_llm.no_failed_embeddings")}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="ai-providers-section options-section">
            <h4>${t("ai_llm.provider_configuration")}</h4>

            <div class="form-group">
                <label>${t("ai_llm.provider_precedence")}</label>
                <input type="hidden" class="ai-provider-precedence" value="">
                <div class="provider-precedence-container">
                    <div class="alert alert-info mb-2">${t("ai_llm.drag_providers_to_reorder")}</div>
                    <div class="standard-list-container mb-3">
                        <div class="standard-list-header">
                            <strong>${t("ai_llm.active_providers")}</strong>
                        </div>
                        <ul class="standard-list-item-list provider-sortable">
                            <li class="standard-list-item d-flex align-items-center" data-provider="openai">
                                <span class="bx bx-menu handle me-2"></span>
                                <strong class="flex-grow-1">OpenAI</strong>
                                <button class="icon-action remove-ai-provider" title="${t("ai_llm.remove_provider")}">
                                    <span class="bx bx-x"></span>
                                </button>
                            </li>
                            <li class="standard-list-item d-flex align-items-center" data-provider="anthropic">
                                <span class="bx bx-menu handle me-2"></span>
                                <strong class="flex-grow-1">Anthropic</strong>
                                <button class="icon-action remove-ai-provider" title="${t("ai_llm.remove_provider")}">
                                    <span class="bx bx-x"></span>
                                </button>
                            </li>
                            <li class="standard-list-item d-flex align-items-center" data-provider="ollama">
                                <span class="bx bx-menu handle me-2"></span>
                                <strong class="flex-grow-1">Ollama</strong>
                                <button class="icon-action remove-ai-provider" title="${t("ai_llm.remove_provider")}">
                                    <span class="bx bx-x"></span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div class="standard-list-container disabled-ai-providers-container" style="display: none;">
                        <div class="standard-list-header">
                            <strong>${t("ai_llm.disabled_providers")}</strong>
                        </div>
                        <ul class="standard-list-item-list provider-disabled">
                            <!-- Disabled providers will be added here dynamically -->
                        </ul>
                    </div>
                </div>
                <div class="form-text">${t("ai_llm.provider_precedence_description")}</div>
            </div>

            <div class="form-group">
                <label>${t("ai_llm.temperature")}</label>
                <input class="ai-temperature form-control" type="number" min="0" max="2" step="0.1">
                <div class="form-text">${t("ai_llm.temperature_description")}</div>
            </div>

            <div class="form-group">
                <label>${t("ai_llm.system_prompt")}</label>
                <textarea class="ai-system-prompt form-control" rows="3"></textarea>
                <div class="form-text">${t("ai_llm.system_prompt_description")}</div>
            </div>
        </div>

        <nav class="options-section-tabs">
            <div class="nav nav-tabs" id="nav-tab" role="tablist">
                <button class="nav-link active" id="nav-openai-tab" data-bs-toggle="tab" data-bs-target="#nav-openai" type="button" role="tab" aria-controls="nav-openai" aria-selected="true">${t("ai_llm.openai_tab")}</button>
                <button class="nav-link" id="nav-anthropic-tab" data-bs-toggle="tab" data-bs-target="#nav-anthropic" type="button" role="tab" aria-controls="nav-anthropic" aria-selected="false">${t("ai_llm.anthropic_tab")}</button>
                <button class="nav-link" id="nav-voyage-tab" data-bs-toggle="tab" data-bs-target="#nav-voyage" type="button" role="tab" aria-controls="nav-voyage" aria-selected="false">${t("ai_llm.voyage_tab")}</button>
                <button class="nav-link" id="nav-ollama-tab" data-bs-toggle="tab" data-bs-target="#nav-ollama" type="button" role="tab" aria-controls="nav-ollama" aria-selected="false">${t("ai_llm.ollama_tab")}</button>
            </div>
        </nav>
        <div class="options-section">
            <div class="tab-content" id="nav-tabContent">
                <div class="tab-pane fade show active" id="nav-openai" role="tabpanel" aria-labelledby="nav-openai-tab">
                    <div class="card">
                        <div class="card-header">
                            <h5>${t("ai_llm.openai_settings")}</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>${t("ai_llm.api_key")}</label>
                                <input type="password" class="openai-api-key form-control" autocomplete="off" />
                                <div class="form-text">${t("ai_llm.openai_api_key_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.url")}</label>
                                <input type="text" class="openai-base-url form-control" />
                                <div class="form-text">${t("ai_llm.openai_url_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.model")}</label>
                                <select class="openai-default-model form-control">
                                    <option value="gpt-4o">GPT-4o (recommended)</option>
                                    <option value="gpt-4">GPT-4</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                                <div class="form-text">${t("ai_llm.openai_model_description")}</div>
                                <button class="btn btn-sm btn-outline-secondary refresh-openai-models">${t("ai_llm.refresh_models")}</button>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.embedding_model")}</label>
                                <select class="openai-embedding-model form-control">
                                    <option value="text-embedding-3-small">text-embedding-3-small (recommended)</option>
                                    <option value="text-embedding-3-large">text-embedding-3-large</option>
                                    <option value="text-embedding-ada-002">text-embedding-ada-002 (legacy)</option>
                                </select>
                                <div class="form-text">${t("ai_llm.openai_embedding_model_description")}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="nav-anthropic" role="tabpanel" aria-labelledby="nav-anthropic-tab">
                    <div class="card">
                        <div class="card-header">
                            <h5>${t("ai_llm.anthropic_configuration")}</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>${t("ai_llm.api_key")}</label>
                                <input type="password" class="anthropic-api-key form-control" autocomplete="off">
                                <div class="form-text">${t("ai_llm.anthropic_api_key_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.url")}</label>
                                <input type="text" class="anthropic-base-url form-control">
                                <div class="form-text">${t("ai_llm.anthropic_url_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.model")}</label>
                                <select class="anthropic-default-model form-control">
                                    <option value="claude-3-opus-20240229">Claude 3 Opus (recommended)</option>
                                    <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                                    <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                                </select>
                                <div class="form-text">${t("ai_llm.anthropic_model_description")}</div>
                                <button class="btn btn-sm btn-outline-secondary refresh-anthropic-models">${t("ai_llm.refresh_models")}</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="nav-voyage" role="tabpanel" aria-labelledby="nav-voyage-tab">
                    <div class="card">
                        <div class="card-header">
                            <h5>${t("ai_llm.voyage_configuration")}</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label>${t("ai_llm.api_key")}</label>
                                <input type="password" class="voyage-api-key form-control" autocomplete="off">
                                <div class="form-text">${t("ai_llm.voyage_api_key_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.embedding_model")}</label>
                                <select class="voyage-embedding-model form-control">
                                    <option value="voyage-2">voyage-2 (recommended)</option>
                                    <option value="voyage-large-2">voyage-large-2</option>
                                </select>
                                <div class="form-text">${t("ai_llm.voyage_embedding_model_description")}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tab-pane fade" id="nav-ollama" role="tabpanel" aria-labelledby="nav-ollama-tab">
                    <div class="card">
                        <div class="card-header">
                            <h5>${t("ai_llm.ollama_configuration")}</h5>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="tn-checkbox">
                                    <input class="ollama-enabled form-check-input" type="checkbox">
                                    ${t("ai_llm.enable_ollama")}
                                </label>
                                <div class="form-text">${t("ai_llm.enable_ollama_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.url")}</label>
                                <input class="ollama-base-url form-control" type="text">
                                <div class="form-text">${t("ai_llm.ollama_url_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.model")}</label>
                                <select class="ollama-default-model form-control">
                                    <option value="llama3">llama3 (recommended)</option>
                                    <option value="mistral">mistral</option>
                                    <option value="phi3">phi3</option>
                                </select>
                                <div class="form-text">${t("ai_llm.ollama_model_description")}</div>
                            </div>

                            <div class="form-group">
                                <label>${t("ai_llm.embedding_model")}</label>
                                <select class="ollama-embedding-model form-control">
                                    <option value="nomic-embed-text">nomic-embed-text (recommended)</option>
                                    <option value="mxbai-embed-large">mxbai-embed-large</option>
                                    <option value="llama3">llama3</option>
                                </select>
                                <div class="form-text">${t("ai_llm.ollama_embedding_model_description")}</div>
                                <button class="btn btn-sm btn-outline-secondary refresh-models">${t("ai_llm.refresh_models")}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="embedding-section options-section">
            <h4>${t("ai_llm.embedding_configuration")}</h4>

            <div class="form-group">
                <label>${t("ai_llm.embedding_default_provider")}</label>
                <select class="embedding-default-provider form-control">
                    <option value="openai">OpenAI</option>
                    <option value="voyage">Voyage AI</option>
                    <option value="ollama">Ollama</option>
                    <option value="local">Local</option>
                </select>
                <div class="form-text">${t("ai_llm.embedding_default_provider_description")}</div>
            </div>

            <div class="form-group">
                <label>${t("ai_llm.embedding_dimension_strategy")}</label>
                <select class="embedding-dimension-strategy form-control">
                    <option value="native">Use native dimensions (preserves information)</option>
                    <option value="regenerate">Regenerate embeddings (most accurate)</option>
                </select>
                <div class="form-text">${t("ai_llm.embedding_dimension_strategy_description")}</div>
            </div>

            <div class="form-group">
                <label>${t("ai_llm.embedding_provider_precedence")}</label>
                <input type="hidden" class="embedding-provider-precedence" value="">
                <div class="embedding-precedence-container">
                    <div class="alert alert-info mb-2">${t("ai_llm.drag_providers_to_reorder")}</div>
                    <div class="standard-list-container mb-3">
                        <div class="standard-list-header">
                            <strong>${t("ai_llm.active_providers")}</strong>
                        </div>
                        <ul class="standard-list-item-list embedding-provider-sortable">
                            <li class="standard-list-item d-flex align-items-center" data-provider="openai">
                                <span class="bx bx-menu handle me-2"></span>
                                <strong class="flex-grow-1">OpenAI</strong>
                                <button class="icon-action remove-provider" title="${t("ai_llm.remove_provider")}">
                                    <span class="bx bx-x"></span>
                                </button>
                            </li>
                            <li class="standard-list-item d-flex align-items-center" data-provider="voyage">
                                <span class="bx bx-menu handle me-2"></span>
                                <strong class="flex-grow-1">Voyage AI</strong>
                                <button class="icon-action remove-provider" title="${t("ai_llm.remove_provider")}">
                                    <span class="bx bx-x"></span>
                                </button>
                            </li>
                            <li class="standard-list-item d-flex align-items-center" data-provider="ollama">
                                <span class="bx bx-menu handle me-2"></span>
                                <strong class="flex-grow-1">Ollama</strong>
                                <button class="icon-action remove-provider" title="${t("ai_llm.remove_provider")}">
                                    <span class="bx bx-x"></span>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div class="standard-list-container disabled-providers-container" style="display: none;">
                        <div class="standard-list-header">
                            <strong>${t("ai_llm.disabled_providers")}</strong>
                        </div>
                        <ul class="standard-list-item-list embedding-provider-disabled">
                            <!-- Disabled providers will be added here dynamically -->
                        </ul>
                    </div>
                </div>
                <div class="form-text">${t("ai_llm.embedding_provider_precedence_description")}</div>
            </div>

            <div class="form-group">
                <label>${t("ai_llm.embedding_generation_location")}</label>
                <select class="embedding-generation-location form-control">
                    <option value="client">${t("ai_llm.embedding_generation_location_client")}</option>
                    <option value="sync_server">${t("ai_llm.embedding_generation_location_sync_server")}</option>
                </select>
                <div class="form-text">${t("ai_llm.embedding_generation_location_description")}</div>
            </div>

            <div class="form-group">
                <label class="tn-checkbox">
                    <input class="embedding-auto-update-enabled form-check-input" type="checkbox">
                    ${t("ai_llm.enable_auto_update_embeddings")}
                </label>
                <div class="form-text">${t("ai_llm.enable_auto_update_embeddings_description")}</div>
            </div>

            <div class="form-group">
                <label class="tn-checkbox">
                    <input class="enable-automatic-indexing form-check-input" type="checkbox">
                    ${t("ai_llm.enable_automatic_indexing")}
                </label>
                <div class="form-text">${t("ai_llm.enable_automatic_indexing_description")}</div>
            </div>

            <hr />

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>${t("ai_llm.similarity_threshold")}</label>
                        <input class="embedding-similarity-threshold form-control" type="number" min="0" max="1" step="0.01">
                        <div class="form-text">${t("ai_llm.similarity_threshold_description")}</div>
                    </div>

                    <div class="form-group">
                        <label>${t("ai_llm.embedding_batch_size")}</label>
                        <input class="embedding-batch-size form-control" type="number" min="1" max="50">
                        <div class="form-text">${t("ai_llm.embedding_batch_size_description")}</div>
                    </div>

                    <div class="form-group">
                        <label>${t("ai_llm.embedding_default_dimension")}</label>
                        <input class="embedding-default-dimension form-control" type="number" min="128">
                        <div class="form-text">${t("ai_llm.embedding_default_dimension_description")}</div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="form-group">
                        <label>${t("ai_llm.max_notes_per_llm_query")}</label>
                        <input class="max-notes-per-llm-query form-control" type="number" min="1" max="50">
                        <div class="form-text">${t("ai_llm.max_notes_per_llm_query_description")}</div>
                    </div>

                    <div class="form-group">
                        <label>${t("ai_llm.embedding_update_interval")}</label>
                        <input class="embedding-update-interval form-control" type="number" min="1000" step="1000">
                        <div class="form-text">${t("ai_llm.embedding_update_interval_description")}</div>
                    </div>
                </div>
            </div>

            <hr />

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <button class="btn btn-sm btn-primary embedding-reprocess-all">
                            ${t("ai_llm.reprocess_all_embeddings")}
                        </button>
                        <div class="form-text">${t("ai_llm.reprocess_all_embeddings_description")}</div>
                    </div>
                </div>

                <div class="col-md-6">
                    <div class="form-group">
                        <button class="btn btn-sm btn-primary reprocess-index">
                            ${t("ai_llm.reprocess_index")}
                        </button>
                        <div class="form-text">${t("ai_llm.reprocess_index_description")}</div>

                        <!-- Index rebuild progress tracking -->
                        <div class="index-rebuild-progress-container mt-2" style="display: none;">
                            <div class="mt-2">
                                <strong>${t("ai_llm.index_rebuild_progress")}:</strong> <span class="index-rebuild-status-text">-</span>
                            </div>
                            <div class="progress mt-1" style="height: 10px;">
                                <div class="progress-bar index-rebuild-progress" role="progressbar" style="width: 0%;"
                                    aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`);

        const $aiEnabled = this.$widget.find('.ai-enabled');
        $aiEnabled.on('change', async () => {
            await this.updateOption('aiEnabled', $aiEnabled.prop('checked') ? "true" : "false");
            this.updateAiSectionVisibility();
            // Display validation warnings when AI is enabled/disabled
            await this.displayValidationWarnings();
        });

        const $ollamaEnabled = this.$widget.find('.ollama-enabled');
        $ollamaEnabled.on('change', async () => {
            await this.updateOption('ollamaEnabled', $ollamaEnabled.prop('checked') ? "true" : "false");
        });

        const $aiProviderPrecedence = this.$widget.find('.ai-provider-precedence');
        $aiProviderPrecedence.on('change', async () => {
            await this.updateOption('aiProviderPrecedence', $aiProviderPrecedence.val() as string);
            // Display validation warnings after changing precedence list
            await this.displayValidationWarnings();
        });

        // Set up provider precedence drag-and-drop functionality
        this.setupProviderPrecedence();

        // Initialize provider orders
        this.initializeAiProviderOrder();
        this.initializeEmbeddingProviderOrder();

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

        const $openaiEmbeddingModel = this.$widget.find('.openai-embedding-model');
        $openaiEmbeddingModel.on('change', async () => {
            await this.updateOption('openaiEmbeddingModel', $openaiEmbeddingModel.val() as string);
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

        const $voyageApiKey = this.$widget.find('.voyage-api-key');
        $voyageApiKey.on('change', async () => {
            await this.updateOption('voyageApiKey', $voyageApiKey.val() as string);
        });

        const $voyageEmbeddingModel = this.$widget.find('.voyage-embedding-model');
        $voyageEmbeddingModel.on('change', async () => {
            await this.updateOption('voyageEmbeddingModel', $voyageEmbeddingModel.val() as string);
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

                    if (embeddingModels.length > 0) {
                        // Add separator if we have embedding models
                        $embedModelSelect.append(`<option disabled>─────────────</option>`);
                    }

                    // Then add general models which can be used for embeddings too
                    const generalModels = response.models.filter(model =>
                        !model.name.includes('embed') && !model.name.includes('bert'));

                    generalModels.forEach(model => {
                        $embedModelSelect.append(`<option value="${model.name}">${model.name}</option>`);
                    });

                    // Try to restore the previously selected value
                    if (currentValue) {
                        $embedModelSelect.val(currentValue);
                        // If the value doesn't exist anymore, select the first option
                        if (!$embedModelSelect.val()) {
                            $embedModelSelect.prop('selectedIndex', 0);
                        }
                    }

                    // Also update the LLM model dropdown
                    const $modelSelect = this.$widget.find('.ollama-default-model');
                    const currentModelValue = $modelSelect.val();

                    // Clear existing options
                    $modelSelect.empty();

                    // Sort models by name to make them easier to find
                    const sortedModels = [...response.models].sort((a, b) => a.name.localeCompare(b.name));

                    // Add all models to the dropdown
                    sortedModels.forEach(model => {
                        $modelSelect.append(`<option value="${model.name}">${model.name}</option>`);
                    });

                    // Try to restore the previously selected value
                    if (currentModelValue) {
                        $modelSelect.val(currentModelValue);
                        // If the value doesn't exist anymore, select the first option
                        if (!$modelSelect.val()) {
                            $modelSelect.prop('selectedIndex', 0);
                        }
                    }

                    toastService.showMessage(`${response.models.length} Ollama models found.`);
                } else {
                    toastService.showError(`No Ollama models found. Please check if Ollama is running.`);
                }
            } catch (e) {
                console.error(`Error fetching Ollama models:`, e);
                toastService.showError(`Error fetching Ollama models: ${e}`);
            } finally {
                $refreshModels.prop('disabled', false);
                $refreshModels.html(`<span class="bx bx-refresh"></span>`);
            }
        });

        // OpenAI models refresh button
        const $refreshOpenAIModels = this.$widget.find('.refresh-openai-models');
        $refreshOpenAIModels.on('click', async () => {
            $refreshOpenAIModels.prop('disabled', true);
            $refreshOpenAIModels.html(`<i class="spinner-border spinner-border-sm"></i>`);

            try {
                const openaiBaseUrl = this.$widget.find('.openai-base-url').val() as string;
                const response = await server.post<OpenAIModelResponse>('openai/list-models', { baseUrl: openaiBaseUrl });

                if (response && response.success) {
                    // Update the chat models dropdown
                    if (response.chatModels?.length > 0) {
                        const $chatModelSelect = this.$widget.find('.openai-default-model');
                        const currentChatValue = $chatModelSelect.val();

                        // Clear existing options
                        $chatModelSelect.empty();

                        // Sort models by name
                        const sortedChatModels = [...response.chatModels].sort((a, b) => a.name.localeCompare(b.name));

                        // Add models to the dropdown
                        sortedChatModels.forEach(model => {
                            $chatModelSelect.append(`<option value="${model.id}">${model.name}</option>`);
                        });

                        // Try to restore the previously selected value
                        if (currentChatValue) {
                            $chatModelSelect.val(currentChatValue);
                            // If the value doesn't exist anymore, select the first option
                            if (!$chatModelSelect.val()) {
                                $chatModelSelect.prop('selectedIndex', 0);
                            }
                        }
                    }

                    // Update the embedding models dropdown
                    if (response.embeddingModels?.length > 0) {
                        const $embedModelSelect = this.$widget.find('.openai-embedding-model');
                        const currentEmbedValue = $embedModelSelect.val();

                        // Clear existing options
                        $embedModelSelect.empty();

                        // Sort models by name
                        const sortedEmbedModels = [...response.embeddingModels].sort((a, b) => a.name.localeCompare(b.name));

                        // Add models to the dropdown
                        sortedEmbedModels.forEach(model => {
                            $embedModelSelect.append(`<option value="${model.id}">${model.name}</option>`);
                        });

                        // Try to restore the previously selected value
                        if (currentEmbedValue) {
                            $embedModelSelect.val(currentEmbedValue);
                            // If the value doesn't exist anymore, select the first option
                            if (!$embedModelSelect.val()) {
                                $embedModelSelect.prop('selectedIndex', 0);
                            }
                        }
                    }

                    // Show success message
                    const totalModels = (response.chatModels?.length || 0) + (response.embeddingModels?.length || 0);
                    toastService.showMessage(`${totalModels} OpenAI models found.`);
                } else {
                    toastService.showError(`No OpenAI models found. Please check your API key and settings.`);
                }
            } catch (e) {
                console.error(`Error fetching OpenAI models:`, e);
                toastService.showError(`Error fetching OpenAI models: ${e}`);
            } finally {
                $refreshOpenAIModels.prop('disabled', false);
                $refreshOpenAIModels.html(`<span class="bx bx-refresh"></span>`);
            }
        });

        // Anthropic models refresh button
        const $refreshAnthropicModels = this.$widget.find('.refresh-anthropic-models');
        $refreshAnthropicModels.on('click', async () => {
            $refreshAnthropicModels.prop('disabled', true);
            $refreshAnthropicModels.html(`<i class="spinner-border spinner-border-sm"></i>`);

            try {
                const anthropicBaseUrl = this.$widget.find('.anthropic-base-url').val() as string;
                const response = await server.post<AnthropicModelResponse>('anthropic/list-models', { baseUrl: anthropicBaseUrl });

                if (response && response.success) {
                    // Update the chat models dropdown
                    if (response.chatModels?.length > 0) {
                        const $chatModelSelect = this.$widget.find('.anthropic-default-model');
                        const currentChatValue = $chatModelSelect.val();

                        // Clear existing options
                        $chatModelSelect.empty();

                        // Sort models by name
                        const sortedChatModels = [...response.chatModels].sort((a, b) => a.name.localeCompare(b.name));

                        // Add models to the dropdown
                        sortedChatModels.forEach(model => {
                            $chatModelSelect.append(`<option value="${model.id}">${model.name}</option>`);
                        });

                        // Try to restore the previously selected value
                        if (currentChatValue) {
                            $chatModelSelect.val(currentChatValue);
                            // If the value doesn't exist anymore, select the first option
                            if (!$chatModelSelect.val()) {
                                $chatModelSelect.prop('selectedIndex', 0);
                            }
                        }
                    }

                    // Handle embedding models if they exist
                    if (response.embeddingModels?.length > 0) {
                        toastService.showMessage(`Found ${response.embeddingModels.length} Anthropic embedding models.`);
                    }

                    // Show success message
                    const totalModels = (response.chatModels?.length || 0) + (response.embeddingModels?.length || 0);
                    toastService.showMessage(`${totalModels} Anthropic models found.`);
                } else {
                    toastService.showError(`No Anthropic models found. Please check your API key and settings.`);
                }
            } catch (e) {
                console.error(`Error fetching Anthropic models:`, e);
                toastService.showError(`Error fetching Anthropic models: ${e}`);
            } finally {
                $refreshAnthropicModels.prop('disabled', false);
                $refreshAnthropicModels.html(`<span class="bx bx-refresh"></span>`);
            }
        });

        // Embedding options event handlers
        const $embeddingAutoUpdateEnabled = this.$widget.find('.embedding-auto-update-enabled');
        $embeddingAutoUpdateEnabled.on('change', async () => {
            await this.updateOption('embeddingAutoUpdateEnabled', $embeddingAutoUpdateEnabled.prop('checked') ? "true" : "false");
        });

        const $enableAutomaticIndexing = this.$widget.find('.enable-automatic-indexing');
        $enableAutomaticIndexing.on('change', async () => {
            await this.updateOption('enableAutomaticIndexing', $enableAutomaticIndexing.prop('checked') ? "true" : "false");
        });

        const $embeddingSimilarityThreshold = this.$widget.find('.embedding-similarity-threshold');
        $embeddingSimilarityThreshold.on('change', async () => {
            await this.updateOption('embeddingSimilarityThreshold', $embeddingSimilarityThreshold.val() as string);
        });

        const $maxNotesPerLlmQuery = this.$widget.find('.max-notes-per-llm-query');
        $maxNotesPerLlmQuery.on('change', async () => {
            await this.updateOption('maxNotesPerLlmQuery', $maxNotesPerLlmQuery.val() as string);
        });

        const $embeddingDefaultProvider = this.$widget.find('.embedding-default-provider');
        $embeddingDefaultProvider.on('change', async () => {
            await this.updateOption('embeddingsDefaultProvider', $embeddingDefaultProvider.val() as string);
            // Display validation warnings after changing default provider
            await this.displayValidationWarnings();
        });

        const $embeddingDimensionStrategy = this.$widget.find('.embedding-dimension-strategy');
        $embeddingDimensionStrategy.on('change', async () => {
            await this.updateOption('embeddingDimensionStrategy', $embeddingDimensionStrategy.val() as string);
        });

        const $embeddingProviderPrecedence = this.$widget.find('.embedding-provider-precedence');
        $embeddingProviderPrecedence.on('change', async () => {
            await this.updateOption('embeddingProviderPrecedence', $embeddingProviderPrecedence.val() as string);
            // Display validation warnings after changing precedence list
            await this.displayValidationWarnings();
        });

        // Set up sortable behavior for the embedding provider precedence list
        const $sortableList = this.$widget.find('.embedding-provider-sortable');

        // Track the item being dragged
        let draggedItem: HTMLElement | null = null;

        // Store a reference to this for use in callbacks
        const self = this;

        // Function to update the hidden input with current order
        const updatePrecedenceValue = () => {
            const providers = $sortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $embeddingProviderPrecedence.val(providers);
            // Trigger the change event to save the option
            $embeddingProviderPrecedence.trigger('change');

            // Show/hide the disabled providers container
            const $disabledContainer = self.$widget.find('.disabled-providers-container');
            const hasDisabledProviders = self.$widget.find('.embedding-provider-disabled li').length > 0;
            $disabledContainer.toggle(hasDisabledProviders);
        };

        // Setup drag handlers for a list item
        const setupDragHandlers = ($item: JQuery) => {
            // Start dragging
            $item.on('dragstart', function(e: JQuery.DragStartEvent) {
                draggedItem = this;
                setTimeout(() => $(this).addClass('dragging'), 0);
                // Set data for drag operation
                e.originalEvent?.dataTransfer?.setData('text/plain', '');
            });

            // End dragging
            $item.on('dragend', function() {
                $(this).removeClass('dragging');
                draggedItem = null;
                // Update the precedence value when dragging ends
                updatePrecedenceValue();
            });

            // Dragging over an item
            $item.on('dragover', function(e: JQuery.DragOverEvent) {
                e.preventDefault();
                if (!draggedItem || this === draggedItem) return;

                $(this).addClass('drag-over');
            });

            // Leaving an item
            $item.on('dragleave', function() {
                $(this).removeClass('drag-over');
            });

            // Dropping on an item
            $item.on('drop', function(e: JQuery.DropEvent) {
                e.preventDefault();
                $(this).removeClass('drag-over');

                if (!draggedItem || this === draggedItem) return;

                // Get the positions of the dragged item and drop target
                const allItems = Array.from($sortableList.find('li').get()) as HTMLElement[];
                const draggedIndex = allItems.indexOf(draggedItem as HTMLElement);
                const dropIndex = allItems.indexOf(this as HTMLElement);

                if (draggedIndex < dropIndex) {
                    // Insert after
                    $(this).after(draggedItem);
                } else {
                    // Insert before
                    $(this).before(draggedItem);
                }

                // Update the precedence value after reordering
                updatePrecedenceValue();
            });
        };

        // Make all list items draggable
        const $listItems = $sortableList.find('li');
        $listItems.attr('draggable', 'true');
        $listItems.each((_, item) => {
            setupDragHandlers($(item));
        });

        // Handle remove provider button clicks
        this.$widget.find('.remove-provider').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(e.currentTarget);
            const $item = $button.closest('li');
            const provider = $item.data('provider');
            const providerName = $item.find('strong').text();

            // Create a new item for the disabled list
            const $disabledItem = $(`
                <li class="standard-list-item d-flex align-items-center" data-provider="${provider}">
                    <strong class="flex-grow-1">${providerName}</strong>
                    <button class="icon-action restore-provider" title="${t("ai_llm.restore_provider")}">
                        <span class="bx bx-plus"></span>
                    </button>
                </li>
            `);

            // Add to disabled list
            this.$widget.find('.embedding-provider-disabled').append($disabledItem);

            // Remove from active list
            $item.remove();

            // Update the hidden input value
            updatePrecedenceValue();

            // Add restore button handler
            $disabledItem.find('.restore-provider').on('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const $restoreButton = $(e.currentTarget);
                const $disabledItem = $restoreButton.closest('li');
                const provider = $disabledItem.data('provider');
                const providerName = $disabledItem.find('strong').text();

                // Create a new item for the active list
                const $activeItem = $(`
                    <li class="standard-list-item d-flex align-items-center" data-provider="${provider}" draggable="true">
                        <span class="bx bx-menu handle me-2"></span>
                        <strong class="flex-grow-1">${providerName}</strong>
                        <button class="icon-action remove-provider" title="${t("ai_llm.remove_provider")}">
                            <span class="bx bx-x"></span>
                        </button>
                    </li>
                `);

                // Make draggable
                $activeItem.attr('draggable', 'true');
                setupDragHandlers($activeItem);

                // Add remove button handler
                $activeItem.find('.remove-provider').on('click', function(e) {
                    $(this).closest('li').find('.remove-provider').trigger('click');
                });

                // Add to active list
                $sortableList.append($activeItem);

                // Remove from disabled list
                $disabledItem.remove();

                // Update the hidden input value
                updatePrecedenceValue();
            });
        });

        // Initialize by setting the value based on current order
        updatePrecedenceValue();

        // Call our new initializeEmbeddingProviderOrder method
        this.initializeEmbeddingProviderOrder();

        const $embeddingGenerationLocation = this.$widget.find('.embedding-generation-location');
        $embeddingGenerationLocation.on('change', async () => {
            await this.updateOption('embeddingGenerationLocation', $embeddingGenerationLocation.val() as string);
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

        const $reprocessIndex = this.$widget.find('.reprocess-index');
        $reprocessIndex.on('click', async () => {
            $reprocessIndex.prop('disabled', true);
            $reprocessIndex.text(t("ai_llm.reprocessing_index"));

            try {
                await server.post('embeddings/rebuild-index');
                toastService.showMessage(t("ai_llm.reprocess_index_started"));
                // Start tracking index rebuild progress
                await this.refreshIndexRebuildStatus();

                // Also refresh embedding stats since they'll update as embeddings are processed
                await this.refreshEmbeddingStats();
            } catch (error) {
                console.error("Error rebuilding index:", error);
                toastService.showError(t("ai_llm.reprocess_index_error"));
            } finally {
                $reprocessIndex.prop('disabled', false);
                $reprocessIndex.text(t("ai_llm.reprocess_index"));
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

        // Add minimal styles for the sortable lists
        if (!$('#embedding-sortable-styles').length) {
            $('head').append(`
                <style id="embedding-sortable-styles">
                    /* Basic drag functionality styles */
                    .embedding-provider-sortable .handle {
                        cursor: grab;
                    }
                    .standard-list-item-list li {
                        cursor: grab;
                    }
                    .standard-list-item-list li.dragging {
                        opacity: 0.7;
                    }
                    .standard-list-item-list li.drag-over {
                        border-width: 2px !important;
                        border-style: dashed !important;
                    }
                </style>
            `);
        }

        return this.$widget;
    }

    async optionsLoaded(options: OptionMap) {
        // Call the ancestor method with the options to store them
        super.optionsLoaded(options);

        // Set values from options to UI components
        if (!this.$widget) return;

        // AI Section
        this.$widget.find('.ai-enabled').prop('checked', options.aiEnabled !== 'false');
        this.$widget.find('.ai-provider-precedence').val(options.aiProviderPrecedence || 'openai,anthropic,ollama');
        this.$widget.find('.ai-system-prompt').val(options.aiSystemPrompt || '');
        this.$widget.find('.ai-temperature').val(options.aiTemperature || '0.7');

        // OpenAI Section
        this.$widget.find('.openai-api-key').val(options.openaiApiKey || '');
        this.$widget.find('.openai-default-model').val(options.openaiDefaultModel || 'gpt-4o');
        this.$widget.find('.openai-embedding-model').val(options.openaiEmbeddingModel || 'text-embedding-3-small');
        this.$widget.find('.openai-base-url').val(options.openaiBaseUrl || 'https://api.openai.com/v1');

        // Anthropic Section
        this.$widget.find('.anthropic-api-key').val(options.anthropicApiKey || '');
        this.$widget.find('.anthropic-default-model').val(options.anthropicDefaultModel || 'claude-3-opus-20240229');
        this.$widget.find('.anthropic-base-url').val(options.anthropicBaseUrl || 'https://api.anthropic.com/v1');

        // Voyage Section
        this.$widget.find('.voyage-api-key').val(options.voyageApiKey || '');
        this.$widget.find('.voyage-embedding-model').val(options.voyageEmbeddingModel || 'voyage-2');

        // Ollama Section
        this.$widget.find('.ollama-enabled').prop('checked', options.ollamaEnabled !== 'false');
        this.$widget.find('.ollama-base-url').val(options.ollamaBaseUrl || 'http://localhost:11434');
        this.$widget.find('.ollama-default-model').val(options.ollamaDefaultModel || 'llama3');
        this.$widget.find('.ollama-embedding-model').val(options.ollamaEmbeddingModel || 'nomic-embed-text');

        // Embedding Section
        this.$widget.find('.embedding-auto-update-enabled').prop('checked', options.embeddingAutoUpdateEnabled !== 'false');
        this.$widget.find('.enable-automatic-indexing').prop('checked', options.enableAutomaticIndexing !== 'false');
        this.$widget.find('.embedding-similarity-threshold').val(options.embeddingSimilarityThreshold || '0.65');
        this.$widget.find('.max-notes-per-llm-query').val(options.maxNotesPerLlmQuery || '10');
        this.$widget.find('.embedding-default-provider').val(options.embeddingsDefaultProvider || 'openai');
        this.$widget.find('.embedding-provider-precedence').val(options.embeddingProviderPrecedence || 'openai,ollama');
        this.$widget.find('.embedding-dimension-strategy').val(options.embeddingDimensionStrategy || 'adapt');
        this.$widget.find('.embedding-generation-location').val(options.embeddingGenerationLocation || 'client');
        this.$widget.find('.embedding-batch-size').val(options.embeddingBatchSize || '10');
        this.$widget.find('.embedding-update-interval').val(options.embeddingUpdateInterval || '5000');
        this.$widget.find('.embedding-default-dimension').val(options.embeddingDefaultDimension || '1536');

        // Make sure to initialize provider orders after options are loaded
        this.initializeAiProviderOrder();
        this.initializeEmbeddingProviderOrder();

        this.updateAiSectionVisibility();

        // Call displayValidationWarnings instead of directly calling validateEmbeddingProviders
        this.displayValidationWarnings();
    }

    updateAiSectionVisibility() {
        if (!this.$widget) return;

        const aiEnabled = this.$widget.find('.ai-enabled').prop('checked');
        this.$widget.find('.ai-providers-section').toggle(aiEnabled);
        this.$widget.find('.ai-provider').toggle(aiEnabled);
        this.$widget.find('.embedding-section').toggle(aiEnabled);
        this.$widget.find('hr').toggle(aiEnabled);

        // Start or stop polling based on visibility
        if (aiEnabled && this.$widget.find('.embedding-section').is(':visible')) {
            this.startStatsPolling();
        } else {
            this.stopStatsPolling();
        }
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

                // Also check index rebuild status
                await this.refreshIndexRebuildStatus(true);

                // Also update failed embeddings list periodically
                await this.updateFailedEmbeddingsList();
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

        if (this.indexRebuildRefreshInterval) {
            clearInterval(this.indexRebuildRefreshInterval);
            this.indexRebuildRefreshInterval = null;
        }
    }

    // Clean up when the widget is removed
    cleanup() {
        this.stopStatsPolling();
        super.cleanup();
    }

    /**
     * Get embedding stats from the server
     */
    async getEmbeddingStats(): Promise<EmbeddingStats | null> {
        try {
            return await server.get('embeddings/stats') as EmbeddingStats;
        } catch (error) {
            console.error('Error fetching embedding stats:', error);
            return null;
        }
    }

    /**
     * Get failed embedding notes from the server
     */
    async getFailedEmbeddingNotes(): Promise<FailedEmbeddingNotes | null> {
        try {
            return await server.get('embeddings/failed') as FailedEmbeddingNotes;
        } catch (error) {
            console.error('Error fetching failed embedding notes:', error);
            return null;
        }
    }

    /**
     * Retry a specific failed embedding
     */
    async retryFailedEmbedding(noteId: string): Promise<boolean> {
        try {
            const result = await server.post(`embeddings/retry/${noteId}`) as {success: boolean};
            return result.success;
        } catch (error) {
            console.error('Error retrying failed embedding:', error);
            return false;
        }
    }

    /**
     * Retry all failed embeddings
     */
    async retryAllFailedEmbeddings(): Promise<boolean> {
        try {
            const result = await server.post('embeddings/retry-all-failed') as {success: boolean};
            return result.success;
        } catch (error) {
            console.error('Error retrying all failed embeddings:', error);
            return false;
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

            const response = await this.getEmbeddingStats();

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

                // Update failed embeddings list if there are failures
                if (stats.failedNotesCount > 0 && !silent) {
                    await this.updateFailedEmbeddingsList();
                }

                // Also check index rebuild status if not in silent mode
                if (!silent) {
                    await this.refreshIndexRebuildStatus(silent);
                }

                // Update validation warnings as embeddings status may have changed
                await this.displayValidationWarnings();
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

    /**
     * Refresh the index rebuild status
     */
    async refreshIndexRebuildStatus(silent = false) {
        if (!this.$widget) return;

        try {
            // Get the current status of index rebuilding
            const response = await server.get('embeddings/index-rebuild-status') as {
                success: boolean,
                status: {
                    inProgress: boolean,
                    progress: number,
                    total: number,
                    current: number
                }
            };

            if (response && response.success) {
                const status = response.status;
                const $progressContainer = this.$widget.find('.index-rebuild-progress-container');
                const $progressBar = this.$widget.find('.index-rebuild-progress');
                const $statusText = this.$widget.find('.index-rebuild-status-text');

                // Only show the progress container if rebuild is in progress
                if (status.inProgress) {
                    $progressContainer.show();
                } else if (status.progress === 100) {
                    // Show for 10 seconds after completion, then hide
                    $progressContainer.show();
                    setTimeout(() => {
                        $progressContainer.fadeOut('slow');
                    }, 10000);
                } else if (status.progress === 0) {
                    // Hide if no rebuild has been started
                    $progressContainer.hide();
                }

                // Update progress bar
                $progressBar.css('width', `${status.progress}%`);
                $progressBar.attr('aria-valuenow', status.progress.toString());
                $progressBar.text(`${status.progress}%`);

                // Update status text
                if (status.inProgress) {
                    $statusText.text(t("ai_llm.index_rebuilding", { percentage: status.progress }));

                    // Apply animated style for active progress
                    $progressBar.addClass('progress-bar-striped progress-bar-animated bg-info');
                    $progressBar.removeClass('bg-success');
                } else if (status.progress === 100) {
                    $statusText.text(t("ai_llm.index_rebuild_complete"));

                    // Apply success style for completed progress
                    $progressBar.removeClass('progress-bar-striped progress-bar-animated bg-info');
                    $progressBar.addClass('bg-success');
                }

                // Start a refresh interval if in progress
                if (status.inProgress && !this.indexRebuildRefreshInterval) {
                    this.indexRebuildRefreshInterval = setInterval(() => {
                        this.refreshIndexRebuildStatus(true);
                    }, this.STATS_REFRESH_INTERVAL);
                } else if (!status.inProgress && this.indexRebuildRefreshInterval) {
                    // Clear the interval if rebuild is complete
                    clearInterval(this.indexRebuildRefreshInterval);
                    this.indexRebuildRefreshInterval = null;
                }
            }
        } catch (error) {
            console.error("Error fetching index rebuild status:", error);
            if (!silent) {
                toastService.showError(t("ai_llm.index_rebuild_status_error"));
            }
        }
    }

    async updateFailedEmbeddingsList() {
        if (!this.$widget) return;

        const failedResult = await this.getFailedEmbeddingNotes();
        if (!failedResult || !failedResult.failedNotes.length) {
            // Use consistent styling with the rest of the application
            this.$widget.find('.embedding-failed-notes-list').html(
                `<div class="alert alert-info">${t("ai_llm.no_failed_embeddings")}</div>`
            );
            return;
        }

        // Create header with count and retry all button
        const $header = $(`
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Failed Embeddings (${failedResult.failedNotes.length})</h6>
                <button class="btn btn-sm btn-primary retry-all-btn">Retry All</button>
            </div>
        `);

        // Create list container using the application's native note-list class
        const $failedList = $('<div class="note-list mb-3">');

        for (const note of failedResult.failedNotes) {
            // Determine if this is a full note failure or just failed chunks
            const isFullFailure = note.failureType === 'full';
            const isPermanentlyFailed = note.isPermanent === true;

            // Use Bootstrap 4 badge classes
            let badgeText = isFullFailure ? 'Full Note' : `Chunks Failed`;
            let badgeClass = 'badge-warning';

            if (isPermanentlyFailed) {
                badgeClass = 'badge-danger';
                if (isFullFailure) {
                    badgeText = 'Permanently Failed';
                } else {
                    badgeText = 'Partially Failed';
                }
            }

            // Use the application's native note-list-item styling without custom font styles
            const $item = $(`
                <div class="note-list-item">
                    <div class="note-book-card p-2">
                        <div class="note-book-content">
                            <div class="note-book-title">
                                <span class="note-title">${note.title || note.noteId}</span>
                                <span class="badge ${badgeClass} ml-2">${badgeText}</span>
                            </div>
                            <div class="note-book-excerpt">
                                <div class="note-detail-field">
                                    <span class="note-detail-label">${isPermanentlyFailed ? 'Status:' : 'Attempts:'}</span>
                                    <span class="note-detail-value">${isPermanentlyFailed ? 'Permanently failed' : note.attempts}</span>
                                </div>
                                <div class="note-detail-field">
                                    <span class="note-detail-label">Last attempt:</span>
                                    <span class="note-detail-value">${note.lastAttempt.substring(0, 19)}</span>
                                </div>
                                <div class="note-detail-field">
                                    <span class="note-detail-label">Error:</span>
                                    <span class="note-detail-value">${(note.error || 'Unknown error').substring(0, 100)}${(note.error && note.error.length > 100) ? '...' : ''}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);

            $failedList.append($item);
        }

        // Add the header and list to the DOM (no card structure)
        this.$widget.find('.embedding-failed-notes-list').empty().append($header, $failedList);

        // Add event handlers using local variables to avoid 'this' issues
        const self = this;

        this.$widget.find('.retry-btn').on('click', async function(e) {
            // Prevent default behavior
            e.preventDefault();

            const $button = $(this);
            const noteId = $button.data('note-id');

            // Show loading state
            $button.prop('disabled', true)
                .removeClass('btn-outline-secondary')
                .addClass('btn-outline-secondary')
                .html('<span class="fa fa-spin fa-spinner mr-1"></span>Retrying');

            const success = await self.retryFailedEmbedding(noteId);

            if (success) {
                toastService.showMessage(t("ai_llm.note_queued_for_retry"));
                await self.refreshEmbeddingStats();
            } else {
                toastService.showError(t("ai_llm.failed_to_retry_note"));
                $button.prop('disabled', false)
                    .html('<i class="fas fa-redo-alt"></i> Retry');
            }
        });

        this.$widget.find('.retry-all-btn').on('click', async function(e) {
            const $button = $(this);

            // Show loading state
            $button.prop('disabled', true)
                .removeClass('btn-primary')
                .addClass('btn-secondary')
                .html('<span class="fa fa-spin fa-spinner mr-1"></span>Retrying All');

            const success = await self.retryAllFailedEmbeddings();

            if (success) {
                toastService.showMessage(t("ai_llm.all_notes_queued_for_retry"));
                await self.refreshEmbeddingStats();

                // Return button to original state after successful refresh
                if (!$button.is(':disabled')) { // Check if button still exists
                    $button.prop('disabled', false)
                        .removeClass('btn-secondary')
                        .addClass('btn-primary')
                        .html('Retry All');
                }
            } else {
                toastService.showError(t("ai_llm.failed_to_retry_all"));
                $button.prop('disabled', false)
                    .removeClass('btn-secondary')
                    .addClass('btn-primary')
                    .html('Retry All');
            }
        });
    }

    // Replace displayValidationWarnings method with client-side implementation
    async displayValidationWarnings() {
        if (!this.$widget) return;

        const $warningDiv = this.$widget.find('.provider-validation-warning');
        let hasWarnings = false;
        let message = 'There are issues with your AI provider configuration:';

        try {
            // Get required data from current settings
            const aiEnabled = this.$widget.find('.ai-enabled').prop('checked');

            // If AI isn't enabled, don't show warnings
            if (!aiEnabled) {
                $warningDiv.hide();
                return;
            }

            // Get default embedding provider
            const defaultProvider = this.$widget.find('.embedding-default-provider').val() as string;

            // Get provider precedence
            const precedenceStr = this.$widget.find('.ai-provider-precedence').val() as string;
            let precedenceList: string[] = [];

            if (precedenceStr) {
                if (precedenceStr.startsWith('[') && precedenceStr.endsWith(']')) {
                    precedenceList = JSON.parse(precedenceStr);
                } else if (precedenceStr.includes(',')) {
                    precedenceList = precedenceStr.split(',').map(p => p.trim());
                } else {
                    precedenceList = [precedenceStr];
                }
            }

            // Get enabled providers
            // Since we don't have direct access to DB from client, we'll use the UI state
            // This is an approximation - enabled providers are generally those with API keys or enabled state
            const enabledProviders: string[] = [];

            // OpenAI is enabled if API key is set
            const openaiKey = this.$widget.find('.openai-api-key').val() as string;
            if (openaiKey) {
                enabledProviders.push('openai');
            }

            // Anthropic is enabled if API key is set
            const anthropicKey = this.$widget.find('.anthropic-api-key').val() as string;
            if (anthropicKey) {
                enabledProviders.push('anthropic');
            }

            // Ollama is enabled if checkbox is checked
            const ollamaEnabled = this.$widget.find('.ollama-enabled').prop('checked');
            if (ollamaEnabled) {
                enabledProviders.push('ollama');
            }

            // Local is always available
            enabledProviders.push('local');

            // Perform validation checks
            const defaultInPrecedence = precedenceList.includes(defaultProvider);
            const defaultIsEnabled = enabledProviders.includes(defaultProvider);
            const allPrecedenceEnabled = precedenceList.every(p => enabledProviders.includes(p));

            // Check for provider configuration issues
            if (!defaultInPrecedence || !defaultIsEnabled || !allPrecedenceEnabled) {
                hasWarnings = true;

                if (!defaultInPrecedence) {
                    message += `<br>• The default embedding provider "${defaultProvider}" is not in your provider precedence list.`;
                }

                if (!defaultIsEnabled) {
                    message += `<br>• The default embedding provider "${defaultProvider}" is not enabled.`;
                }

                if (!allPrecedenceEnabled) {
                    const disabledProviders = precedenceList.filter(p => !enabledProviders.includes(p));
                    message += `<br>• The following providers in your precedence list are not enabled: ${disabledProviders.join(', ')}.`;
                }
            }

            // Check if embeddings are still being processed
            const queuedNotes = parseInt(this.$widget.find('.embedding-queued-notes').text(), 10);
            if (!isNaN(queuedNotes) && queuedNotes > 0) {
                hasWarnings = true;
                message += `<br>• There are currently ${queuedNotes} notes in the embedding processing queue.`;
                message += ` Some AI features may produce incomplete results until processing completes.`;
            }

            // Show warning message if there are any issues
            if (hasWarnings) {
                message += '<br><br>Please check your AI settings.';
                $warningDiv.html(message);
                $warningDiv.show();
            } else {
                $warningDiv.hide();
            }
        } catch (error) {
            console.error('Error validating embedding providers:', error);
            $warningDiv.hide();
        }
    }

    /**
     * Set up drag and drop functionality for AI provider precedence
     */
    setupProviderPrecedence() {
        if (!this.$widget) return;

        // Setup event handlers for AI provider buttons
        this.setupAiProviderRemoveHandlers();

        // Setup drag handlers for all AI provider items
        const $aiSortableList = this.$widget.find('.provider-sortable');
        const $aiListItems = $aiSortableList.find('li');
        $aiListItems.attr('draggable', 'true');
        $aiListItems.each((_, item) => {
            this.setupAiItemDragHandlers($(item));
        });

        // Setup event handlers for embedding provider buttons
        this.setupEmbeddingProviderRemoveHandlers();

        // Setup drag handlers for all embedding provider items
        const $embeddingSortableList = this.$widget.find('.embedding-provider-sortable');
        const $embeddingListItems = $embeddingSortableList.find('li');
        $embeddingListItems.attr('draggable', 'true');
        $embeddingListItems.each((_, item) => {
            this.setupEmbeddingItemDragHandlers($(item));
        });
    }

    /**
     * Setup event handlers for embedding provider remove buttons
     */
    setupEmbeddingProviderRemoveHandlers() {
        if (!this.$widget) return;

        const self = this;
        const $embeddingProviderPrecedence = this.$widget.find('.embedding-provider-precedence');
        const $embeddingSortableList = this.$widget.find('.embedding-provider-sortable');

        // Remove any existing handlers to prevent duplicates
        this.$widget.find('.remove-provider').off('click');

        // Add remove button click handler to all provider items
        this.$widget.find('.remove-provider').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const $item = $button.closest('li');
            const provider = $item.data('provider');
            const providerName = $item.find('strong').text();

            // Create a new item for the disabled list
            const $disabledItem = $(`
                <li class="standard-list-item d-flex align-items-center" data-provider="${provider}">
                    <strong class="flex-grow-1">${providerName}</strong>
                    <button class="icon-action restore-provider" title="${t("ai_llm.restore_provider")}">
                        <span class="bx bx-plus"></span>
                    </button>
                </li>
            `);

            // Add to disabled list
            self.$widget.find('.embedding-provider-disabled').append($disabledItem);

            // Remove from active list
            $item.remove();

            // Setup restore handler
            self.setupEmbeddingProviderRestoreHandler($disabledItem);

            // Update the hidden input value based on current order
            const providers = $embeddingSortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $embeddingProviderPrecedence.val(providers);
            // Trigger the change event to save the option
            $embeddingProviderPrecedence.trigger('change');

            // Show/hide the disabled providers container
            const $disabledContainer = self.$widget.find('.disabled-providers-container');
            const hasDisabledProviders = self.$widget.find('.embedding-provider-disabled li').length > 0;
            $disabledContainer.toggle(hasDisabledProviders);
        });
    }

    /**
     * Setup restore button handler for disabled embedding providers
     */
    setupEmbeddingProviderRestoreHandler($disabledItem: JQuery) {
        if (!this.$widget) return;

        const self = this;
        const $embeddingProviderPrecedence = this.$widget.find('.embedding-provider-precedence');
        const $embeddingSortableList = this.$widget.find('.embedding-provider-sortable');

        $disabledItem.find('.restore-provider').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const $disabledItem = $button.closest('li');
            const provider = $disabledItem.data('provider');
            const providerName = $disabledItem.find('strong').text();

            // Create a new item for the active list
            const $activeItem = $(`
                <li class="standard-list-item d-flex align-items-center" data-provider="${provider}" draggable="true">
                    <span class="bx bx-menu handle me-2"></span>
                    <strong class="flex-grow-1">${providerName}</strong>
                    <button class="icon-action remove-provider" title="${t("ai_llm.remove_provider")}">
                        <span class="bx bx-x"></span>
                    </button>
                </li>
            `);

            // Add to active list
            $embeddingSortableList.append($activeItem);

            // Remove from disabled list
            $disabledItem.remove();

            // Setup drag handlers for the new item
            self.setupEmbeddingItemDragHandlers($activeItem);

            // Setup remove button handler
            $activeItem.find('.remove-provider').on('click', function() {
                $(this).closest('li').find('.remove-provider').trigger('click');
            });

            // Update the hidden input value based on current order
            const providers = $embeddingSortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $embeddingProviderPrecedence.val(providers);
            // Trigger the change event to save the option
            $embeddingProviderPrecedence.trigger('change');

            // Show/hide the disabled providers container
            const $disabledContainer = self.$widget.find('.disabled-providers-container');
            const hasDisabledProviders = self.$widget.find('.embedding-provider-disabled li').length > 0;
            $disabledContainer.toggle(hasDisabledProviders);
        });
    }

    /**
     * Setup drag handlers for an embedding provider list item
     */
    setupEmbeddingItemDragHandlers($item: JQuery) {
        if (!this.$widget) return;

        const self = this;
        const $embeddingProviderPrecedence = this.$widget.find('.embedding-provider-precedence');
        const $embeddingSortableList = this.$widget.find('.embedding-provider-sortable');

        // Setup dragstart handler
        $item.on('dragstart', function(e: JQuery.DragStartEvent) {
            $(this).addClass('dragging');
            e.originalEvent?.dataTransfer?.setData('text/plain', '');
        });

        // Setup dragend handler
        $item.on('dragend', function() {
            $(this).removeClass('dragging');

            // Update the hidden input value
            const providers = $embeddingSortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $embeddingProviderPrecedence.val(providers);
            $embeddingProviderPrecedence.trigger('change');
        });

        // Setup dragover handler
        $item.on('dragover', function(e: JQuery.DragOverEvent) {
            e.preventDefault();
            const draggingItem = self.$widget?.find('.dragging');
            if (!draggingItem?.length || this === draggingItem.get(0)) return;

            $(this).addClass('drag-over');
        });

        // Setup dragleave handler
        $item.on('dragleave', function() {
            $(this).removeClass('drag-over');
        });

        // Setup drop handler
        $item.on('drop', function(e: JQuery.DropEvent) {
            e.preventDefault();
            $(this).removeClass('drag-over');

            const draggingItem = self.$widget?.find('.dragging');
            if (!draggingItem?.length || this === draggingItem.get(0)) return;

            // Get positions - fixed to handle type errors
            const $this = $(this);
            const allItems = Array.from($embeddingSortableList.find('li').get());
            const draggedIndex = allItems.findIndex(item => $(item).is(draggingItem));
            const dropIndex = allItems.findIndex(item => $(item).is($this));

            if (draggedIndex >= 0 && dropIndex >= 0) {
                if (draggedIndex < dropIndex) {
                    // Insert after
                    $this.after(draggingItem);
                } else {
                    // Insert before
                    $this.before(draggingItem);
                }

                // Update precedence
                const providers = $embeddingSortableList.find('li').map(function() {
                    return $(this).data('provider');
                }).get().join(',');

                $embeddingProviderPrecedence.val(providers);
                $embeddingProviderPrecedence.trigger('change');
            }
        });
    }

    /**
     * Initialize the embedding provider precedence order based on saved values
     */
    initializeEmbeddingProviderOrder() {
        if (!this.$widget) return;

        const $embeddingProviderPrecedence = this.$widget.find('.embedding-provider-precedence');
        const $sortableList = this.$widget.find('.embedding-provider-sortable');

        // Get the current value
        const savedValue = $embeddingProviderPrecedence.val() as string;
        if (!savedValue) return;

        // Get all available providers
        const allProviders = ['openai', 'voyage', 'ollama', 'local'];
        const savedProviders = savedValue.split(',');

        // Clear all items from the disabled list first to avoid duplicates
        this.$widget.find('.embedding-provider-disabled').empty();

        // Find disabled providers (providers in allProviders but not in savedProviders)
        const disabledProviders = allProviders.filter(p => !savedProviders.includes(p));

        // Move saved providers to the end in the correct order
        savedProviders.forEach(provider => {
            const $item = $sortableList.find(`li[data-provider="${provider}"]`);
            if ($item.length) {
                $sortableList.append($item); // Move to the end in the correct order
            }
        });

        // Setup remove click handlers first to ensure they work when simulating clicks
        this.setupEmbeddingProviderRemoveHandlers();

        // Move disabled providers to the disabled list
        disabledProviders.forEach(provider => {
            const $item = $sortableList.find(`li[data-provider="${provider}"]`);
            if ($item.length) {
                // Simulate clicking the remove button to move it to the disabled list
                $item.find('.remove-provider').trigger('click');
            } else {
                // If it's not in the active list already, manually create it in the disabled list
                const providerName = this.getProviderDisplayName(provider);
                const $disabledItem = $(`
                    <li class="standard-list-item d-flex align-items-center" data-provider="${provider}">
                        <strong class="flex-grow-1">${providerName}</strong>
                        <button class="icon-action restore-provider" title="${t("ai_llm.restore_provider")}">
                            <span class="bx bx-plus"></span>
                        </button>
                    </li>
                `);
                this.$widget.find('.embedding-provider-disabled').append($disabledItem);

                // Add restore button handler
                this.setupEmbeddingProviderRestoreHandler($disabledItem);
            }
        });

        // Show/hide the disabled providers container
        const $disabledContainer = this.$widget.find('.disabled-providers-container');
        const hasDisabledProviders = this.$widget.find('.embedding-provider-disabled li').length > 0;
        $disabledContainer.toggle(hasDisabledProviders);
    }

    /**
     * Setup drag handlers for an AI provider list item
     */
    setupAiItemDragHandlers($item: JQuery) {
        if (!this.$widget) return;

        const self = this;
        const $aiProviderPrecedence = this.$widget.find('.ai-provider-precedence');
        const $aiSortableList = this.$widget.find('.provider-sortable');

        // Setup dragstart handler
        $item.on('dragstart', function(e: JQuery.DragStartEvent) {
            $(this).addClass('dragging');
            e.originalEvent?.dataTransfer?.setData('text/plain', '');
        });

        // Setup dragend handler
        $item.on('dragend', function() {
            $(this).removeClass('dragging');

            // Update the hidden input value
            const providers = $aiSortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $aiProviderPrecedence.val(providers);
            $aiProviderPrecedence.trigger('change');
        });

        // Setup dragover handler
        $item.on('dragover', function(e: JQuery.DragOverEvent) {
            e.preventDefault();
            const draggingItem = self.$widget?.find('.dragging');
            if (!draggingItem?.length || this === draggingItem.get(0)) return;

            $(this).addClass('drag-over');
        });

        // Setup dragleave handler
        $item.on('dragleave', function() {
            $(this).removeClass('drag-over');
        });

        // Setup drop handler
        $item.on('drop', function(e: JQuery.DropEvent) {
            e.preventDefault();
            $(this).removeClass('drag-over');

            const draggingItem = self.$widget?.find('.dragging');
            if (!draggingItem?.length || this === draggingItem.get(0)) return;

            // Get positions - fixed to handle type errors
            const $this = $(this);
            const allItems = Array.from($aiSortableList.find('li').get());
            const draggedIndex = allItems.findIndex(item => $(item).is(draggingItem));
            const dropIndex = allItems.findIndex(item => $(item).is($this));

            if (draggedIndex >= 0 && dropIndex >= 0) {
                if (draggedIndex < dropIndex) {
                    // Insert after
                    $this.after(draggingItem);
                } else {
                    // Insert before
                    $this.before(draggingItem);
                }

                // Update precedence
                const providers = $aiSortableList.find('li').map(function() {
                    return $(this).data('provider');
                }).get().join(',');

                $aiProviderPrecedence.val(providers);
                $aiProviderPrecedence.trigger('change');
            }
        });
    }

    /**
     * Initialize the AI provider precedence order based on saved values
     */
    initializeAiProviderOrder() {
        if (!this.$widget) return;

        const $aiProviderPrecedence = this.$widget.find('.ai-provider-precedence');
        const $aiSortableList = this.$widget.find('.provider-sortable');

        // Get the current value
        const savedValue = $aiProviderPrecedence.val() as string;
        if (!savedValue) return;

        // Get all available providers
        const allProviders = ['openai', 'anthropic', 'ollama', 'voyage'];
        const savedProviders = savedValue.split(',');

        // Clear all items from the disabled list first to avoid duplicates
        this.$widget.find('.provider-disabled').empty();

        // Find disabled providers (providers in allProviders but not in savedProviders)
        const disabledProviders = allProviders.filter(p => !savedProviders.includes(p));

        // Move saved providers to the end in the correct order
        savedProviders.forEach(provider => {
            const $item = $aiSortableList.find(`li[data-provider="${provider}"]`);
            if ($item.length) {
                $aiSortableList.append($item); // Move to the end in the correct order
            }
        });

        // Setup remove click handlers first to ensure they work when simulating clicks
        this.setupAiProviderRemoveHandlers();

        // Move disabled providers to the disabled list
        disabledProviders.forEach(provider => {
            const $item = $aiSortableList.find(`li[data-provider="${provider}"]`);
            if ($item.length) {
                // Simulate clicking the remove button to move it to the disabled list
                $item.find('.remove-ai-provider').trigger('click');
            } else {
                // If it's not in the active list already, manually create it in the disabled list
                const providerName = this.getProviderDisplayName(provider);
                const $disabledItem = $(`
                    <li class="standard-list-item d-flex align-items-center" data-provider="${provider}">
                        <strong class="flex-grow-1">${providerName}</strong>
                        <button class="icon-action restore-ai-provider" title="${t("ai_llm.restore_provider")}">
                            <span class="bx bx-plus"></span>
                        </button>
                    </li>
                `);
                this.$widget.find('.provider-disabled').append($disabledItem);

                // Add restore button handler
                this.setupAiProviderRestoreHandler($disabledItem);
            }
        });

        // Show/hide the disabled providers container
        const $disabledContainer = this.$widget.find('.disabled-ai-providers-container');
        const hasDisabledProviders = this.$widget.find('.provider-disabled li').length > 0;
        $disabledContainer.toggle(hasDisabledProviders);
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
     * Setup event handlers for AI provider remove buttons
     */
    setupAiProviderRemoveHandlers() {
        if (!this.$widget) return;

        const self = this;
        const $aiProviderPrecedence = this.$widget.find('.ai-provider-precedence');
        const $aiSortableList = this.$widget.find('.provider-sortable');

        // Remove any existing handlers to prevent duplicates
        this.$widget.find('.remove-ai-provider').off('click');

        // Add remove button click handler to all provider items
        this.$widget.find('.remove-ai-provider').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const $item = $button.closest('li');
            const provider = $item.data('provider');
            const providerName = $item.find('strong').text();

            // Create a new item for the disabled list
            const $disabledItem = $(`
                <li class="standard-list-item d-flex align-items-center" data-provider="${provider}">
                    <strong class="flex-grow-1">${providerName}</strong>
                    <button class="icon-action restore-ai-provider" title="${t("ai_llm.restore_provider")}">
                        <span class="bx bx-plus"></span>
                    </button>
                </li>
            `);

            // Add to disabled list
            self.$widget.find('.provider-disabled').append($disabledItem);

            // Remove from active list
            $item.remove();

            // Setup restore handler
            self.setupAiProviderRestoreHandler($disabledItem);

            // Update the hidden input value based on current order
            const providers = $aiSortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $aiProviderPrecedence.val(providers);
            // Trigger the change event to save the option
            $aiProviderPrecedence.trigger('change');

            // Show/hide the disabled providers container
            const $disabledContainer = self.$widget.find('.disabled-ai-providers-container');
            const hasDisabledProviders = self.$widget.find('.provider-disabled li').length > 0;
            $disabledContainer.toggle(hasDisabledProviders);
        });
    }

    /**
     * Setup restore button handler for disabled AI providers
     */
    setupAiProviderRestoreHandler($disabledItem: JQuery) {
        if (!this.$widget) return;

        const self = this;
        const $aiProviderPrecedence = this.$widget.find('.ai-provider-precedence');
        const $aiSortableList = this.$widget.find('.provider-sortable');

        $disabledItem.find('.restore-ai-provider').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const $button = $(this);
            const $disabledItem = $button.closest('li');
            const provider = $disabledItem.data('provider');
            const providerName = $disabledItem.find('strong').text();

            // Create a new item for the active list
            const $activeItem = $(`
                <li class="standard-list-item d-flex align-items-center" data-provider="${provider}" draggable="true">
                    <span class="bx bx-menu handle me-2"></span>
                    <strong class="flex-grow-1">${providerName}</strong>
                    <button class="icon-action remove-ai-provider" title="${t("ai_llm.remove_provider")}">
                        <span class="bx bx-x"></span>
                    </button>
                </li>
            `);

            // Add to active list
            $aiSortableList.append($activeItem);

            // Remove from disabled list
            $disabledItem.remove();

            // Setup drag handlers for the new item
            self.setupAiItemDragHandlers($activeItem);

            // Setup remove button handler
            $activeItem.find('.remove-ai-provider').on('click', function() {
                $(this).closest('li').find('.remove-ai-provider').trigger('click');
            });

            // Update the hidden input value based on current order
            const providers = $aiSortableList.find('li').map(function() {
                return $(this).data('provider');
            }).get().join(',');

            $aiProviderPrecedence.val(providers);
            // Trigger the change event to save the option
            $aiProviderPrecedence.trigger('change');

            // Show/hide the disabled providers container
            const $disabledContainer = self.$widget.find('.disabled-ai-providers-container');
            const hasDisabledProviders = self.$widget.find('.provider-disabled li').length > 0;
            $disabledContainer.toggle(hasDisabledProviders);
        });
    }

}

