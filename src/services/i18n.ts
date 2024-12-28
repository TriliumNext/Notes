import i18next from "i18next";
import Backend from "i18next-fs-backend";
import options from "./options.js";
import sql_init from "./sql_init.js";
import { join } from "path";
import { getResourceDir } from "./utils.js";
import hidden_subtree from "./hidden_subtree.js";

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
