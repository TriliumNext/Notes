import { formatDateTime } from "../../../utils/formatters.js";
import { t } from "../../../services/i18n.js";
import dialogService from "../../../services/dialog.js";
import OptionsWidget from "./options_widget.js";
import server from "../../../services/server.js";
import toastService from "../../../services/toast.js";

const TPL = /*html*/`
<div class="etapi-options-section options-section">
    <h4>${t("etapi.title")}</h4>

    <p class="form-text">${t("etapi.description")} <br/>
      ${t("etapi.see_more", {
        link_to_wiki: `<a class="tn-link" href="https://triliumnext.github.io/Docs/Wiki/etapi.html">${t("etapi.wiki")}</a>`,
        // TODO: We use window.open src/public/app/services/link.ts -> prevents regular click behavior on "a" element here because it's a relative path
        link_to_openapi_spec: `<a class="tn-link" onclick="window.open('etapi/etapi.openapi.yaml')" href="etapi/etapi.openapi.yaml">${t("etapi.openapi_spec")}</a>`,
        link_to_swagger_ui: `<a class="tn-link" href="#_help_f3xpgx6H01PW">${t("etapi.swagger_ui")}</a>`
      })}
    </p>

    <button type="button" class="create-etapi-token btn btn-sm">
        <span class="bx bx-plus"></span>
        ${t("etapi.create_token")}
    </button>

    <hr />

    <h5>${t("etapi.existing_tokens")}</h5>

    <div class="no-tokens-yet">${t("etapi.no_tokens_yet")}</div>

    <div style="overflow: auto; height: 500px;">
        <table class="tokens-table table table-stripped">
        <thead>
            <tr>
                <th>${t("etapi.token_name")}</th>
                <th>${t("etapi.created")}</th>
                <th>${t("etapi.actions")}</th>
            </tr>
        </thead>
        <tbody></tbody>
        </table>
    </div>
</div>

<style>
    .token-table-button {
        display: inline-block;
        cursor: pointer;
        padding: 3px;
        margin-right: 20px;
        font-size: large;
        border: 1px solid transparent;
        border-radius: var(--button-border-radius);
    }

    .token-table-button:hover {
        border: 1px solid var(--button-border-color);
    }
</style>`;

// TODO: Deduplicate
interface PostTokensResponse {
    authToken: string;
}

// TODO: Deduplicate
interface Token {
    name: string;
    utcDateCreated: number;
    etapiTokenId: string;
}

export default class EtapiOptions extends OptionsWidget {

    doRender() {
        this.$widget = $(TPL);

        this.$widget.find(".create-etapi-token").on("click", async () => {
            const tokenName = await dialogService.prompt({
                title: t("etapi.new_token_title"),
                message: t("etapi.new_token_message"),
                defaultValue: t("etapi.default_token_name")
            });

            if (!tokenName?.trim()) {
                toastService.showError(t("etapi.error_empty_name"));
                return;
            }

            const { authToken } = await server.post<PostTokensResponse>("etapi-tokens", { tokenName });

            await dialogService.prompt({
                title: t("etapi.token_created_title"),
                message: t("etapi.token_created_message"),
                defaultValue: authToken
            });

            this.refreshTokens();
        });

        this.refreshTokens();
    }

    async refreshTokens() {
        const $noTokensYet = this.$widget.find(".no-tokens-yet");
        const $tokensTable = this.$widget.find(".tokens-table");

        const tokens = await server.get<Token[]>("etapi-tokens");

        $noTokensYet.toggle(tokens.length === 0);
        $tokensTable.toggle(tokens.length > 0);

        const $tokensTableBody = $tokensTable.find("tbody");
        $tokensTableBody.empty();

        for (const token of tokens) {
            $tokensTableBody.append(
                $("<tr>")
                    .append($("<td>").text(token.name))
                    .append($("<td>").text(formatDateTime(token.utcDateCreated)))
                    .append(
                        $("<td>").append(
                            $(`<span class="bx bx-edit-alt token-table-button icon-action" title="${t("etapi.rename_token")}"></span>`).on("click", () => this.renameToken(token.etapiTokenId, token.name)),
                            $(`<span class="bx bx-trash token-table-button icon-action" title="${t("etapi.delete_token")}"></span>`).on("click", () => this.deleteToken(token.etapiTokenId, token.name))
                        )
                    )
            );
        }
    }

    async renameToken(etapiTokenId: string, oldName: string) {
        const tokenName = await dialogService.prompt({
            title: t("etapi.rename_token_title"),
            message: t("etapi.rename_token_message"),
            defaultValue: oldName
        });

        if (!tokenName?.trim()) {
            return;
        }

        await server.patch(`etapi-tokens/${etapiTokenId}`, { name: tokenName });

        this.refreshTokens();
    }

    async deleteToken(etapiTokenId: string, name: string) {
        if (!(await dialogService.confirm(t("etapi.delete_token_confirmation", { name })))) {
            return;
        }

        await server.remove(`etapi-tokens/${etapiTokenId}`);

        this.refreshTokens();
    }
}
