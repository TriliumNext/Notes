import library_loader from "./library_loader.js";

await library_loader.requireLibrary(library_loader.I18NEXT);

await i18next
    .use(i18nextHttpBackend)
    .init({
        lng: "en",
        fallbackLng: "en",
        debug: true,
        backend: {
            loadPath: `/${window.glob.assetPath}/translations/{{lng}}/{{ns}}.json`
        }
    });

export const t = i18next.t;
