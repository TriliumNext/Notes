import type { OptionMap } from "../../../../../../services/options_interface.js";
import { t } from "../../../../services/i18n.js";
import library_loader from "../../../../services/library_loader.js";
import server from "../../../../services/server.js";
import OptionsWidget from "../options_widget.js";

const SAMPLE_LANGUAGE = "javascript";
const SAMPLE_CODE = `\
const n = 10;
greet(n); // Print "Hello World" for n times

/**
 * Displays a "Hello World!" message for a given amount of times, on the standard console. The "Hello World!" text will be displayed once per line.
 *
 * @param {number} times    The number of times to print the \`Hello World!\` message.
 */
function greet(times) {
  for (let i = 0; i++; i < times) {
    console.log("Hello World!");
  }
}
`;

const TPL = `
<div class="options-section">
    <h4>${t("highlighting.title")}</h4>

    <p>${t("highlighting.description")}</p>

    <div class="form-group row">
        <div class="col-md-6">
            <label for="highlighting-color-scheme-select">${t("highlighting.color-scheme")}</label>
            <select id="highlighting-color-scheme-select" class="theme-select form-select"></select>
        </div>

        <div class="col-md-6 side-checkbox">
            <label class="form-check tn-checkbox">
                <input type="checkbox" class="word-wrap form-check-input" />
                ${t("code_block.word_wrapping")}
            </label>
        </div>
    </div>

    <div class="form-group row">
        <div class="note-detail-readonly-text-content ck-content code-sample-wrapper">
            <pre class="hljs"><code class="code-sample">${SAMPLE_CODE}</code></pre>
        </div>
    </div>

    <style>
        .code-sample-wrapper {
            margin-top: 1em;
        }
    </style>
</div>
`;

interface Theme {
    title: string;
    val: string;
}

type Response = Record<string, Theme[]>

/**
 * Contains appearance settings for code blocks within text notes, such as the theme for the syntax highlighter.
 */
export default class CodeBlockOptions extends OptionsWidget {

    private $themeSelect!: JQuery<HTMLElement>;
    private $wordWrap!: JQuery<HTMLElement>;
    private $sampleEl!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$themeSelect = this.$widget.find(".theme-select");
        this.$themeSelect.on("change", async () => {
            const newTheme = String(this.$themeSelect.val());
            library_loader.loadHighlightingTheme(newTheme);
            await server.put(`options/codeBlockTheme/${newTheme}`);
        });

        this.$wordWrap = this.$widget.find("input.word-wrap");
        this.$wordWrap.on("change", () => this.updateCheckboxOption("codeBlockWordWrap", this.$wordWrap));

        // Set up preview
        this.$sampleEl = this.$widget.find(".code-sample");
    }

    #setupPreview(shouldEnableSyntaxHighlight: boolean) {
        const text = SAMPLE_CODE;
        if (shouldEnableSyntaxHighlight) {
            library_loader.requireLibrary(library_loader.HIGHLIGHT_JS).then(() => {
                const highlightedText = hljs.highlight(text, {
                    language: SAMPLE_LANGUAGE
                });
                this.$sampleEl.html(highlightedText.value);
            });
        } else {
            this.$sampleEl.text(text);
        }
    }

    async optionsLoaded(options: OptionMap) {
        const themeGroups = await server.get<Response>("options/codeblock-themes");
        this.$themeSelect.empty();

        for (const [key, themes] of Object.entries(themeGroups)) {
            const $group = key ? $("<optgroup>").attr("label", key) : null;

            for (const theme of themes) {
                const option = $("<option>").attr("value", theme.val).text(theme.title);

                if ($group) {
                    $group.append(option);
                } else {
                    this.$themeSelect.append(option);
                }
            }
            if ($group) {
                this.$themeSelect.append($group);
            }
        }
        this.$themeSelect.val(options.codeBlockTheme);
        this.setCheckboxState(this.$wordWrap, options.codeBlockWordWrap);
        this.$widget.closest(".note-detail-printable").toggleClass("word-wrap", options.codeBlockWordWrap === "true");

        this.#setupPreview(options.codeBlockTheme !== "none");
    }
}
