import { describe, expect, it } from "vitest";
import becca from "../becca/becca.js";
import sql from "./sql.js";
import migration from "./migration.js";
import cls from "./cls.js";

describe("Migration", () => {
    it("migrates from v214", async () => {
        await new Promise<void>((resolve) => {
            cls.init(async () => {
                sql.rebuildIntegrationTestDatabase("spec/db/document_v214.db");
                await migration.migrateIfNecessary();
                expect(sql.getValue("SELECT count(*) FROM blobs")).toBe(116);
                resolve();
            });
        });
    });
});
