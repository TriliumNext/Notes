import options from "./options.js";
import i18next from "i18next";
import i18nextHttpBackend from "i18next-http-backend";

export async function initLocale() {
    const locale = (options.get("locale") as string) || "en";

    await i18next.use(i18nextHttpBackend).init({
        lng: locale,
        fallbackLng: "en",
        backend: {
            loadPath: `${window.glob.assetPath}/translations/{{lng}}/{{ns}}.json`
        },
        returnEmptyString: false
    });
}

export const t = i18next.t;
export const getCurrentLanguage = () => i18next.language;
