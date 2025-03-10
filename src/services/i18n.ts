import i18next from "i18next";
import Backend from "i18next-fs-backend";
import options from "./options.js";
import sql_init from "./sql_init.js";
import { join } from "path";
import { getResourceDir } from "./utils.js";
import hidden_subtree from "./hidden_subtree.js";

export interface Locale {
    id: string;
    name: string;
    /** `true` if the language is a right-to-left one, or `false` if it's left-to-right. */
    rtl?: boolean;
    /** `true` if the language is not supported by the application as a display language, but it is selectable by the user for the content. */
    contentOnly?: boolean;
}

const LOCALES: Locale[] = [
    {
        id: "en",
        name: "English"
    },
    {
        id: "de",
        name: "Deutsch"
    },
    {
        id: "es",
        name: "Español"
    },
    {
        id: "fr",
        name: "Français"
    },
    {
        id: "cn",
        name: "简体中文"
    },
    {
        id: "tw",
        name: "繁體中文"
    },
    {
        id: "ro",
        name: "Română"
    },

    /*
     * Right to left languages
     *
     * Currently they are only for setting the language of text notes.
     */
    { // Arabic
        id: "ar",
        name: "اَلْعَرَبِيَّةُ",
        rtl: true,
        contentOnly: true
    },
    { // Hebrew
        id: "he",
        name: "עברית",
        rtl: true,
        contentOnly: true
    },
    { // Kurdish
        id: "ku",
        name: "کوردی",
        rtl: true,
        contentOnly: true
    },
    { // Persian
        id: "fa",
        name: "فارسی",
        rtl: true,
        contentOnly: true
    }
].sort((a, b) => a.name.localeCompare(b.name));

export async function initializeTranslations() {
    const resourceDir = getResourceDir();

    // Initialize translations
    await i18next.use(Backend).init({
        lng: getCurrentLanguage(),
        fallbackLng: "en",
        ns: "server",
        backend: {
            loadPath: join(resourceDir, "translations/{{lng}}/{{ns}}.json")
        }
    });
}

export function getLocales(): Locale[] {
    return LOCALES;
}

function getCurrentLanguage() {
    let language;
    if (sql_init.isDbInitialized()) {
        language = options.getOptionOrNull("locale");
    }

    if (!language) {
        console.info("Language option not found, falling back to en.");
        language = "en";
    }

    return language;
}

export async function changeLanguage(locale: string) {
    await i18next.changeLanguage(locale);
    hidden_subtree.checkHiddenSubtree(true, { restoreNames: true });
}
