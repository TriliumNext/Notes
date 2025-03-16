import { describe, expect, it } from "vitest";
import * as i18n from "./i18n.js";
import path from "path";
import fs from "fs";

function checkTranslations(translationDir: string, translationFileName: string) {
    const locales = i18n.getLocales();

    for (const locale of locales) {
        if (locale.contentOnly) {
            continue;
        }

        const translationPath = path.join(translationDir, locale.id, translationFileName);
        const translationFile = fs.readFileSync(translationPath, { encoding: "utf-8" });
        expect(() => {
            JSON.parse(translationFile);
        }, `JSON error while parsing locale '${locale.id}' at "${translationPath}"`).not.toThrow();
    }
}

describe("i18n", () => {
    it("frontend translations are valid JSON", () => {
        checkTranslations("src/public/translations", "translation.json");
    });

    it("backend translations are valid JSON", () => {
        checkTranslations("translations", "server.json");
    });
});
