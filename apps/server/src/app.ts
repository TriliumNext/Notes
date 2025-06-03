import express from "express";
import path from "path";
import favicon from "serve-favicon";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import config from "./services/config.js";
import utils, { getResourceDir, isDev } from "./services/utils.js";
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
import "./services/handlers.js";
import "./becca/becca_loader.js";
import { RESOURCE_DIR } from "./services/resource_dir.js";

/**
 * Initialize or shutdown LLM features based on settings
 */
async function manageLLMFeatures(enabled: boolean) {
    if (enabled) {
        log.info("LLM features enabled in settings, initializing...");
        try {
            // Initialize embedding providers
            log.info("Initializing embedding providers...");
            const { initializeEmbeddings } = await import("./services/llm/embeddings/init.js");
            await initializeEmbeddings();
            log.info("Embedding providers initialized");

            // Initialize the index service for LLM functionality
            log.info("Initializing index service...");
            const { default: indexService } = await import("./services/llm/index_service.js");
            await indexService.initialize()
                .then(() => log.info("Index service initialized successfully"))
                .catch((error) => {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    log.error(`Failed to initialize index service: ${errorMsg}`);
                    console.error("Failed to initialize index service:", error);
                });

            log.info("LLM features initialization completed");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            log.error(`Error initializing LLM features: ${errorMsg}`);
            console.error("Error initializing LLM features:", error);
        }
    } else {
        log.info("LLM features disabled in settings, shutting down...");
        try {
            // Get index service and shut it down if it exists
            try {
                const { default: indexService } = await import("./services/llm/index_service.js");
                if (indexService && typeof indexService.shutdown === 'function') {
                    await indexService.shutdown();
                    log.info("Index service shut down successfully");
                }
            } catch (error) {
                // Skip if index service can't be loaded
                log.info(`Index service not available for shutdown: ${error}`);
            }
            
            log.info("LLM features shutdown completed");
        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            log.error(`Error shutting down LLM features: ${errorMsg}`);
            console.error("Error shutting down LLM features:", error);
        }
    }
}

export default async function buildApp() {
    const app = express();

    // Initialize DB
    sql_init.initializeDb();

    // Listen for database initialization event
    eventService.subscribe(eventService.DB_INITIALIZED, async () => {
        try {
            log.info("Database initialized, setting up LLM features with delay to ensure all services are ready");
            
            // Add a small delay to ensure all services are completely initialized
            // This helps prevent race conditions where the database is marked as initialized
            // but other dependent services haven't fully loaded
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if AI features are enabled
            const aiEnabled = await (await import("./services/options.js")).default.getOptionBool('aiEnabled');
            if (aiEnabled) {
                await manageLLMFeatures(true);
            } else {
                log.info("LLM features disabled in settings, skipping initialization");
            }
        } catch (error) {
            log.error("Error initializing LLM features:", error);
            console.error("Error initializing LLM features:", error);
        }
    });

    // Initialize LLM features only if database is already initialized
    if (sql_init.isDbInitialized()) {
        try {
            // Check if AI features are enabled
            const aiEnabled = await (await import("./services/options.js")).default.getOptionBool('aiEnabled');
            if (aiEnabled) {
                await manageLLMFeatures(true);
            } else {
                log.info("LLM features disabled in settings, skipping initialization");
            }
        } catch (error) {
            console.error("Error initializing LLM features:", error);
            log.error(`Error initializing LLM features: ${error}`);
        }
    } else {
        log.info("Database not initialized yet. LLM features will be initialized after setup.");
    }
    
    // Listen for changes to the aiEnabled option
    eventService.subscribe(eventService.ENTITY_CHANGED, async ({ entityName, entity }) => {
        if (entityName === "options" && entity && entity.name === 'aiEnabled' && sql_init.isDbInitialized()) {
            const enabled = entity.value === "true";
            log.info(`AI features ${enabled ? 'enabled' : 'disabled'} in settings`);
            await manageLLMFeatures(enabled);
        }
    });

    const publicDir = isDev ? path.join(getResourceDir(), "../dist/public") : path.join(getResourceDir(), "public");
    const publicAssetsDir = path.join(publicDir, "assets");
    const assetsDir = RESOURCE_DIR;

    // view engine setup
    app.set("views", path.join(assetsDir, "views"));
    app.engine("ejs", (await import("ejs")).renderFile);
    app.set("view engine", "ejs");

    app.use((req, res, next) => {
        // set CORS header
        if (config["Network"]["corsAllowOrigin"]) {
            res.header("Access-Control-Allow-Origin", config["Network"]["corsAllowOrigin"]);
        }
        if (config["Network"]["corsAllowMethods"]) {
            res.header("Access-Control-Allow-Methods", config["Network"]["corsAllowMethods"]);
        }
        if (config["Network"]["corsAllowHeaders"]) {
            res.header("Access-Control-Allow-Headers", config["Network"]["corsAllowHeaders"]);
        }

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

    app.use(express.static(path.join(publicDir, "root")));
    app.use(`/manifest.webmanifest`, express.static(path.join(publicAssetsDir, "manifest.webmanifest")));
    app.use(`/robots.txt`, express.static(path.join(publicAssetsDir, "robots.txt")));
    app.use(`/icon.png`, express.static(path.join(publicAssetsDir, "icon.png")));

    const sessionParser = (await import("./routes/session_parser.js")).default;
    app.use(sessionParser);
    app.use(favicon(path.join(assetsDir, "icon.ico")));

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

    return app;
}
