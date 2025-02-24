import type { Application, Router } from "express";
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import yaml from "js-yaml";
import type { JsonObject } from "swagger-ui-express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const etapiDocument = yaml.load(
    await readFile(join(__dirname, "../etapi/etapi.openapi.yaml"), "utf8")
) as JsonObject;
const apiDocument = JSON.parse(await readFile(join(__dirname, "api", "openapi.json"), "utf-8"));

function register(app: Application) {
    app.use(
        "/etapi/docs/",
        swaggerUi.serveFiles(etapiDocument),
        swaggerUi.setup(etapiDocument, {
            explorer: true,
            customSiteTitle: "TriliumNext ETAPI Documentation"
        })
    );

    app.use(
        "/api/docs/",
        swaggerUi.serveFiles(apiDocument),
        swaggerUi.setup(apiDocument, {
            explorer: true,
            customSiteTitle: "TriliumNext Internal API Documentation"
        })
    );
}

export default {
    register
};
