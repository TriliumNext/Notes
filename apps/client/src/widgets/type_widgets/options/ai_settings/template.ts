import { t } from "../../../../services/i18n.js";

export const TPL = `
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
        <input type="text" class="ai-provider-precedence form-control" placeholder="openai,anthropic,ollama">
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
                        </select>
                        <div class="form-text">${t("ai_llm.openai_embedding_model_description")}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="tab-pane fade" id="nav-anthropic" role="tabpanel" aria-labelledby="nav-anthropic-tab">
            <div class="card">
                <div class="card-header">
                    <h5>${t("ai_llm.anthropic_settings")}</h5>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>${t("ai_llm.api_key")}</label>
                        <input type="password" class="anthropic-api-key form-control" autocomplete="off" />
                        <div class="form-text">${t("ai_llm.anthropic_api_key_description")}</div>
                    </div>

                    <div class="form-group">
                        <label>${t("ai_llm.url")}</label>
                        <input type="text" class="anthropic-base-url form-control" />
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
                    <h5>${t("ai_llm.voyage_settings")}</h5>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>${t("ai_llm.api_key")}</label>
                        <input type="password" class="voyage-api-key form-control" autocomplete="off" />
                        <div class="form-text">${t("ai_llm.voyage_api_key_description")}</div>
                    </div>

                    <div class="form-group">
                        <label>${t("ai_llm.embedding_model")}</label>
                        <select class="voyage-embedding-model form-control">
                            <option value="voyage-2">Voyage-2 (recommended)</option>
                            <option value="voyage-2-code">Voyage-2-Code</option>
                            <option value="voyage-large-2">Voyage-Large-2</option>
                        </select>
                        <div class="form-text">${t("ai_llm.voyage_embedding_model_description")}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="tab-pane fade" id="nav-ollama" role="tabpanel" aria-labelledby="nav-ollama-tab">
            <div class="card">
                <div class="card-header">
                    <h5>${t("ai_llm.ollama_settings")}</h5>
                </div>
                <div class="card-body">
                    <div class="form-group">
                        <label>${t("ai_llm.url")}</label>
                        <input type="text" class="ollama-base-url form-control" />
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
                        <button class="btn btn-sm btn-outline-secondary refresh-models"><span class="bx bx-refresh"></span></button>
                    </div>

                    <div class="form-group">
                        <label>${t("ai_llm.embedding_model")}</label>
                        <select class="ollama-embedding-model form-control">
                            <option value="nomic-embed-text">nomic-embed-text (recommended)</option>
                            <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2</option>
                        </select>
                        <div class="form-text">${t("ai_llm.ollama_embedding_model_description")}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="options-section">
    <h4>${t("ai_llm.embeddings_configuration")}</h4>

    <div class="form-group">
        <label class="embedding-provider-label">${t("ai_llm.embedding_provider_precedence")}</label>
        <input type="text" class="embedding-provider-precedence form-control" placeholder="openai,voyage,ollama,local">
        <div class="form-text">${t("ai_llm.embedding_provider_precedence_description")}</div>
    </div>

    <div class="form-group">
        <label>${t("ai_llm.embedding_dimension_strategy")}</label>
        <select class="embedding-dimension-strategy form-control">
            <option value="auto">${t("ai_llm.embedding_dimension_auto")}</option>
            <option value="fixed-768">${t("ai_llm.embedding_dimension_fixed")} (768)</option>
            <option value="fixed-1024">${t("ai_llm.embedding_dimension_fixed")} (1024)</option>
            <option value="fixed-1536">${t("ai_llm.embedding_dimension_fixed")} (1536)</option>
        </select>
        <div class="form-text">${t("ai_llm.embedding_dimension_strategy_description")}</div>
    </div>

    <div class="form-group">
        <label>${t("ai_llm.embedding_similarity_threshold")}</label>
        <input class="embedding-similarity-threshold form-control" type="number" min="0" max="1" step="0.01">
        <div class="form-text">${t("ai_llm.embedding_similarity_threshold_description")}</div>
    </div>

    <div class="form-group">
        <label>${t("ai_llm.embedding_batch_size")}</label>
        <input class="embedding-batch-size form-control" type="number" min="1" max="100" step="1">
        <div class="form-text">${t("ai_llm.embedding_batch_size_description")}</div>
    </div>

    <div class="form-group">
        <label>${t("ai_llm.embedding_update_interval")}</label>
        <input class="embedding-update-interval form-control" type="number" min="100" max="60000" step="100">
        <div class="form-text">${t("ai_llm.embedding_update_interval_description")}</div>
    </div>

    <div class="form-group">
        <label>${t("ai_llm.max_notes_per_llm_query")}</label>
        <input class="max-notes-per-llm-query form-control" type="number" min="1" max="20" step="1">
        <div class="form-text">${t("ai_llm.max_notes_per_llm_query_description")}</div>
    </div>

    <div class="form-group">
        <label class="tn-checkbox">
            <input class="enable-automatic-indexing form-check-input" type="checkbox">
            ${t("ai_llm.enable_automatic_indexing")}
        </label>
        <div class="form-text">${t("ai_llm.enable_automatic_indexing_description")}</div>
    </div>

    <div class="form-group mt-3">
        <label class="tn-checkbox">
            <input class="embedding-auto-update-enabled form-check-input" type="checkbox">
            ${t("ai_llm.embedding_auto_update_enabled")}
        </label>
        <div class="form-text">${t("ai_llm.embedding_auto_update_enabled_description")}</div>
    </div>

    <!-- Recreate embeddings button -->
    <div class="form-group mt-3">
        <button class="btn btn-outline-primary recreate-embeddings">
            ${t("ai_llm.recreate_embeddings")}
        </button>
        <div class="form-text">${t("ai_llm.recreate_embeddings_description")}</div>
    </div>

    <!-- Rebuild index button -->
    <div class="form-group mt-3">
        <button class="btn btn-outline-primary rebuild-embeddings-index">
            ${t("ai_llm.rebuild_index")}
        </button>
        <div class="form-text">${t("ai_llm.rebuild_index_description")}</div>
    </div>

    <!-- Note about embedding provider precedence -->
    <div class="form-group mt-3">
        <h5>${t("ai_llm.embedding_providers_order")}</h5>
        <div class="form-text mt-2">${t("ai_llm.embedding_providers_order_description")}</div>
    </div>
</div>`;
