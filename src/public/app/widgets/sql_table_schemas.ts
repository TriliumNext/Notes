import { t } from "../services/i18n.js";
import NoteContextAwareWidget from "./note_context_aware_widget.js";
import server from "../services/server.js";
import type FNote from "../entities/fnote.js";

const TPL = /*html*/`
<div class="sql-table-schemas-widget">
    <style>
    .sql-table-schemas-widget {
        padding: 12px;
        padding-right: 10%;
    }

    .sql-table-schemas button {
        padding: 0.25rem 0.4rem;
        font-size: 0.875rem;
        line-height: 0.5;
        border: 1px solid var(--button-border-color);
        border-radius: var(--button-border-radius);
        background: var(--button-background-color);
        color: var(--button-text-color);
    }

    .sql-console-result-container {
        width: 100%;
        font-size: smaller;
        margin-top: 10px;
        flex-grow: 1;
        overflow: auto;
        min-height: 0;
    }

    .table-schema td {
        padding: 5px;
    }
    </style>

    ${t("sql_table_schemas.tables")}:
    <span class="sql-table-schemas"></span>
</div>`;

interface SchemaResponse {
    name: string;
    columns: {
        name: string;
        type: string;
    }[];
}

export default class SqlTableSchemasWidget extends NoteContextAwareWidget {

    private tableSchemasShown?: boolean;
    private $sqlConsoleTableSchemas!: JQuery<HTMLElement>;

    isEnabled() {
        return this.note && this.note.mime === "text/x-sqlite;schema=trilium" && super.isEnabled();
    }

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$sqlConsoleTableSchemas = this.$widget.find(".sql-table-schemas");
    }

    async refreshWithNote(note: FNote) {
        if (this.tableSchemasShown) {
            return;
        }

        this.tableSchemasShown = true;

        const tableSchema = await server.get<SchemaResponse[]>("sql/schema");

        for (const table of tableSchema) {
            const $tableLink = $('<button class="btn">').text(table.name);

            const $table = $('<table class="table-schema">');

            for (const column of table.columns) {
                $table.append($("<tr>").append($("<td>").text(column.name)).append($("<td>").text(column.type)));
            }

            this.$sqlConsoleTableSchemas.append($tableLink).append(" ");

            $tableLink.tooltip({
                html: true,
                placement: "bottom",
                title: $table[0].outerHTML,
                sanitize: false
            });
        }
    }
}
