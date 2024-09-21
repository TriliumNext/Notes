import { initializeTranslations } from "./src/services/i18n.js";

await initializeTranslations();
await import("./electron.js")