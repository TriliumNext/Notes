import OptionsWidget from "../options_widget.js";
import { t } from "../../../../services/i18n.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

// TODO: Deduplicate with src/services/html_sanitizer once there is a commons project between client and server.
export const DEFAULT_ALLOWED_TAGS = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "p",
    "a",
    "ul",
    "ol",
    "li",
    "b",
    "i",
    "strong",
    "em",
    "strike",
    "s",
    "del",
    "abbr",
    "code",
    "hr",
    "br",
    "div",
    "table",
    "thead",
    "caption",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "pre",
    "section",
    "img",
    "figure",
    "figcaption",
    "span",
    "label",
    "input",
    "details",
    "summary",
    "address",
    "aside",
    "footer",
    "header",
    "hgroup",
    "main",
    "nav",
    "dl",
    "dt",
    "menu",
    "bdi",
    "bdo",
    "dfn",
    "kbd",
    "mark",
    "q",
    "time",
    "var",
    "wbr",
    "area",
    "map",
    "track",
    "video",
    "audio",
    "picture",
    "del",
    "ins",
    "en-media", // for ENEX import
    // Additional tags (https://github.com/TriliumNext/Notes/issues/567)
    "acronym",
    "article",
    "big",
    "button",
    "cite",
    "col",
    "colgroup",
    "data",
    "dd",
    "fieldset",
    "form",
    "legend",
    "meter",
    "noscript",
    "option",
    "progress",
    "rp",
    "samp",
    "small",
    "sub",
    "sup",
    "template",
    "textarea",
    "tt"
];

const TPL = `
<div class="options-section">
    <h4>${t("import.html_import_tags.title")}</h4>

    <p>${t("import.html_import_tags.description")}</p>

    <textarea class="allowed-html-tags form-control" style="height: 150px; font-family: monospace;"
                placeholder="${t("import.html_import_tags.placeholder")}"></textarea>

    <div>
        <button class="btn btn-sm btn-secondary reset-to-default">
            ${t("import.html_import_tags.reset_button")}
        </button>
    </div>
</div>`;

export default class HtmlImportTagsOptions extends OptionsWidget {

    private $allowedTags!: JQuery<HTMLElement>;
    private $resetButton!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.contentSized();

        this.$allowedTags = this.$widget.find(".allowed-html-tags");
        this.$resetButton = this.$widget.find(".reset-to-default");

        this.$allowedTags.on("change", () => this.saveTags());
        this.$resetButton.on("click", () => this.resetToDefault());

        // Load initial tags
        this.refresh();
    }

    async optionsLoaded(options: OptionMap) {
        try {
            if (options.allowedHtmlTags) {
                const tags = JSON.parse(options.allowedHtmlTags);
                this.$allowedTags.val(tags.join(" "));
            } else {
                // If no tags are set, show the defaults
                this.$allowedTags.val(DEFAULT_ALLOWED_TAGS.join(" "));
            }
        } catch (e) {
            console.error("Could not load HTML tags:", e);
            // On error, show the defaults
            this.$allowedTags.val(DEFAULT_ALLOWED_TAGS.join(" "));
        }
    }

    async saveTags() {
        const tagsText = String(this.$allowedTags.val()) || "";
        const tags = tagsText
            .split(/[\n,\s]+/) // Split on newlines, commas, or spaces
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        await this.updateOption("allowedHtmlTags", JSON.stringify(tags));
    }

    async resetToDefault() {
        this.$allowedTags.val(DEFAULT_ALLOWED_TAGS.join("\n")); // Use actual newline
        await this.saveTags();
    }
}
