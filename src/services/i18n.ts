import i18next from "i18next";
import Backend from "i18next-fs-backend";
import options from "./options.js";
import sql_init from "./sql_init.js";

export async function initializeTranslations() {
  // Initialize translations
  await i18next.use(Backend).init({
      lng: await getCurrentLanguage(),
      fallbackLng: "en",
      ns: "server",
      backend: {
          loadPath: "translations/{{lng}}/{{ns}}.json"
      }
  });
}

function getCurrentLanguage() {
  let language;
  if (sql_init.isDbInitialized()) {
    language = options.getOption("locale");  
  }

  if (!language) {
    console.info("Language option not found, falling back to en.");
    language = "en";
  }

  return language;
}