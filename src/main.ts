/*
 * Make sure not to import any modules that depend on localized messages via i18next here, as the initializations
 * are loaded later and will result in an empty string.
 */

import { initializeTranslations } from "./services/i18n.js";

async function startApplication() {
    await import("./www.js");
}

await initializeTranslations();
await startApplication();
