import library_loader from "./library_loader.js";
import options from "./options.js";

await library_loader.requireLibrary(library_loader.I18NEXT);

export async function initLocale() {
    const locale = options.get("locale") || "en";

    await i18next
        .use(i18nextHttpBackend)
        .init({
            lng: locale,
            fallbackLng: "en",
            backend: {
                loadPath: `${window.glob.assetPath}/translations/{{lng}}/{{ns}}.json`
            },
            returnEmptyString: false
        });
}

export const t = i18next.t;
