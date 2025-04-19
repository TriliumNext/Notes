export interface Locale {
    id: string;
    name: string;
    /** `true` if the language is a right-to-left one, or `false` if it's left-to-right. */
    rtl?: boolean;
    /** `true` if the language is not supported by the application as a display language, but it is selectable by the user for the content. */
    contentOnly?: boolean;
    /** The value to pass to `--lang` for the Electron instance in order to set it as a locale. Not setting it will hide it from the list of supported locales. */
    electronLocale?: string;
}