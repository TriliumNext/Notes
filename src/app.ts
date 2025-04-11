import express from "express";
import path from "path";
import favicon from "serve-favicon";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname } from "path";
import sessionParser from "./routes/session_parser.js";
import utils from "./services/utils.js";
import assets from "./routes/assets.js";
import routes from "./routes/routes.js";
import custom from "./routes/custom.js";
import error_handlers from "./routes/error_handlers.js";
import { startScheduledCleanup } from "./services/erase.js";
import sql_init from "./services/sql_init.js";
import { auth } from "express-openid-connect";
import openID from "./services/open_id.js";
import { t } from "i18next";
import eventService from "./services/events.js";
import log from "./services/log.js";

await import("./services/handlers.js");
await import("./becca/becca_loader.js");

const app = express();

const scriptDir = dirname(fileURLToPath(import.meta.url));

// Initialize DB
sql_init.initializeDb();

// Listen for database initialization event
eventService.subscribe(eventService.DB_INITIALIZED, async () => {
    try {
        log.info("Database initialized, setting up LLM features");

        // Initialize embedding providers
        const { initializeEmbeddings } = await import("./services/llm/embeddings/init.js");
        await initializeEmbeddings();

        // Initialize the index service for LLM functionality
        const { default: indexService } = await import("./services/llm/index_service.js");
        await indexService.initialize().catch(e => console.error("Failed to initialize index service:", e));

        log.info("LLM features initialized successfully");
    } catch (error) {
        console.error("Error initializing LLM features:", error);
    }
});

// Initialize LLM features only if database is already initialized
if (sql_init.isDbInitialized()) {
    try {
        // Initialize embedding providers
        const { initializeEmbeddings } = await import("./services/llm/embeddings/init.js");
        await initializeEmbeddings();

        // Initialize the index service for LLM functionality
        const { default: indexService } = await import("./services/llm/index_service.js");
        await indexService.initialize().catch(e => console.error("Failed to initialize index service:", e));
    } catch (error) {
        console.error("Error initializing LLM features:", error);
    }
} else {
    console.log("Database not initialized yet. LLM features will be initialized after setup.");
}

// view engine setup
app.set("views", path.join(scriptDir, "views"));
app.set("view engine", "ejs");

app.use((req, res, next) => {
    res.locals.t = t;
    return next();
});

if (!utils.isElectron) {
    app.use(compression()); // HTTP compression
}

app.use(
    helmet({
        hidePoweredBy: false, // errors out in electron
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);

app.use(express.text({ limit: "500mb" }));
app.use(express.json({ limit: "500mb" }));
app.use(express.raw({ limit: "500mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(scriptDir, "public/root")));
app.use(`/manifest.webmanifest`, express.static(path.join(scriptDir, "public/manifest.webmanifest")));
app.use(`/robots.txt`, express.static(path.join(scriptDir, "public/robots.txt")));
app.use(`/icon.png`, express.static(path.join(scriptDir, "public/icon.png")));
app.use(sessionParser);
app.use(favicon(`${scriptDir}/../images/app-icons/icon.ico`));

if (openID.isOpenIDEnabled())
    app.use(auth(openID.generateOAuthConfig()));

await assets.register(app);
routes.register(app);
custom.register(app);
error_handlers.register(app);

// triggers sync timer
await import("./services/sync.js");

// triggers backup timer
await import("./services/backup.js");

// trigger consistency checks timer
await import("./services/consistency_checks.js");

await import("./services/scheduler.js");

startScheduledCleanup();

if (utils.isElectron) {
    (await import("@electron/remote/main/index.js")).initialize();
}

export default app;
