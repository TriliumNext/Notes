import { t } from "../../../../services/i18n.js";
import OptionsWidget from "../options_widget.js";
import mimeTypesService from "../../../../services/mime_types.js";
import type { OptionMap } from "../../../../../../services/options_interface.js";

const TPL = `
<div class="options-section">
    <h4>${t("code_mime_types.title")}</h4>

    <ul class="options-mime-types" style="list-style-type: none;"></ul>
</div>

<style>
.options-mime-types section,
.options-mime-types > li:first-of-type {
    margin-bottom: 1em;
}
</style>
`;

let idCtr = 1; // global, since this can be shown in multiple dialogs

interface MimeType {
    title: string;
    mime: string;
    enabled: boolean;
}

type GroupedMimes = Record<string, MimeType[]>;

function groupMimeTypesAlphabetically(ungroupedMimeTypes: MimeType[]) {
    const result: GroupedMimes = {};
    ungroupedMimeTypes = ungroupedMimeTypes.toSorted((a, b) => a.title.localeCompare(b.title));

    for (const mimeType of ungroupedMimeTypes) {
        const initial = mimeType.title.charAt(0).toUpperCase();
        if (!result[initial]) {
            result[initial] = [];
        }
        result[initial].push(mimeType);
    }
    return result;
}

export default class CodeMimeTypesOptions extends OptionsWidget {

    private $mimeTypes!: JQuery<HTMLElement>;

    doRender() {
        this.$widget = $(TPL);
        this.$mimeTypes = this.$widget.find(".options-mime-types");
    }

    async optionsLoaded(options: OptionMap) {
        this.$mimeTypes.empty();
        mimeTypesService.loadMimeTypes();

        const ungroupedMimeTypes = Array.from(mimeTypesService.getMimeTypes());
        const plainTextMimeType = ungroupedMimeTypes.shift();
        const groupedMimeTypes = groupMimeTypesAlphabetically(ungroupedMimeTypes);

        // Plain text is displayed at the top intentionally.
        if (plainTextMimeType) {
            const $plainEl = this.#buildSelectionForMimeType(plainTextMimeType);
            $plainEl.find("input").attr("disabled", "");
            this.$mimeTypes.append($plainEl);
        }

        for (const [initial, mimeTypes] of Object.entries(groupedMimeTypes)) {
            const $section = $("<section>");
            $section.append($("<h5>").text(initial));

            for (const mimeType of mimeTypes) {
                $section.append(this.#buildSelectionForMimeType(mimeType));
            }

            this.$mimeTypes.append($section);
        }
    }

    async save() {
        const enabledMimeTypes: string[] = [];

        this.$mimeTypes.find("input:checked").each((i, el) => {
            const mimeType = this.$widget.find(el).attr("data-mime-type");
            if (mimeType) {
                enabledMimeTypes.push(mimeType);
            }
        });

        await this.updateOption("codeNotesMimeTypes", JSON.stringify(enabledMimeTypes));
    }

    #buildSelectionForMimeType(mimeType: MimeType) {
        const id = "code-mime-type-" + idCtr++;

        const checkbox = $(`<label class="tn-checkbox">`)
            .append($('<input type="checkbox" class="form-check-input">').attr("id", id).attr("data-mime-type", mimeType.mime).prop("checked", mimeType.enabled))
            .on("change", () => this.save())
            .append(mimeType.title)

        return $("<li>")
            .append(checkbox);
    }
}
