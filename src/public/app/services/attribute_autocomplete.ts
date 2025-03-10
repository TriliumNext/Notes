import type { AttributeType } from "../entities/fattribute.js";
import server from "./server.js";

interface InitOptions {
    $el: JQuery<HTMLElement>;
    attributeType?: AttributeType | (() => AttributeType);
    open: boolean;
    nameCallback?: () => string;
}

/**
 * @param $el - element on which to init autocomplete
 * @param attributeType - "relation" or "label" or callback providing one of those values as a type of autocompleted attributes
 * @param open - should the autocomplete be opened after init?
 */
function initAttributeNameAutocomplete({ $el, attributeType, open }: InitOptions) {
    if (!$el.hasClass("aa-input")) {
        $el.autocomplete(
            {
                appendTo: document.querySelector("body"),
                hint: false,
                openOnFocus: true,
                minLength: 0,
                tabAutocomplete: false
            },
            [
                {
                    displayKey: "name",
                    // disabling cache is important here because otherwise cache can stay intact when switching between attribute type which will lead to autocomplete displaying attribute names for incorrect attribute type
                    cache: false,
                    source: async (term, cb) => {
                        const type = typeof attributeType === "function" ? attributeType() : attributeType;

                        const names = await server.get<string[]>(`attribute-names/?type=${type}&query=${encodeURIComponent(term)}`);
                        const result = names.map((name) => ({ name }));

                        cb(result);
                    }
                }
            ]
        );

        $el.on("autocomplete:opened", () => {
            if ($el.attr("readonly")) {
                $el.autocomplete("close");
            }
        });
    }

    if (open) {
        $el.autocomplete("open");
    }
}

async function initLabelValueAutocomplete({ $el, open, nameCallback }: InitOptions) {
    if ($el.hasClass("aa-input")) {
        // we reinit every time because autocomplete seems to have a bug where it retains state from last
        // open even though the value was reset
        $el.autocomplete("destroy");
    }

    let attributeName = "";
    if (nameCallback) {
        attributeName = nameCallback();
    }

    if (attributeName.trim() === "") {
        return;
    }

    const attributeValues = (await server.get<string[]>(`attribute-values/${encodeURIComponent(attributeName)}`)).map((attribute) => ({ value: attribute }));

    if (attributeValues.length === 0) {
        return;
    }

    $el.autocomplete(
        {
            appendTo: document.querySelector("body"),
            hint: false,
            openOnFocus: false, // handled manually
            minLength: 0,
            tabAutocomplete: false
        },
        [
            {
                displayKey: "value",
                cache: false,
                source: async function (term, cb) {
                    term = term.toLowerCase();

                    const filtered = attributeValues.filter((attr) => attr.value.toLowerCase().includes(term));

                    cb(filtered);
                }
            }
        ]
    );

    $el.on("autocomplete:opened", () => {
        if ($el.attr("readonly")) {
            $el.autocomplete("close");
        }
    });

    if (open) {
        $el.autocomplete("open");
    }
}

export default {
    initAttributeNameAutocomplete,
    initLabelValueAutocomplete
};
