import { initializeTranslations } from "@triliumnext/server/src/services/i18n.js";

await initializeTranslations();
await import("./electron.js");
