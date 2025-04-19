import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import supertest from "supertest";
import { initializeTranslations } from "../services/i18n.js";
import type { Application, Request, Response, NextFunction } from "express";
import { safeExtractMessageAndStackFromError } from "../services/utils.js";

let app: Application;

describe("Share API test", () => {
    let cannotSetHeadersCount = 0;

    beforeAll(async () => {
        initializeTranslations();
        app = (await import("../app.js")).default;
        app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
            const [ errMessage ] = safeExtractMessageAndStackFromError(err);
            if (errMessage.includes("Cannot set headers after they are sent to the client")) {
                cannotSetHeadersCount++;
            }

            next();
        });
    });

    beforeEach(() => {
        cannotSetHeadersCount = 0;
    });

    it("requests password for password-protected share", async () => {
        await supertest(app)
            .get("/share/YjlPRj2E9fOV")
            .expect(401)
            .expect("WWW-Authenticate", 'Basic realm="User Visible Realm", charset="UTF-8"');
        expect(cannotSetHeadersCount).toBe(0);
    });

});
