import etapiTokenService from "./etapi_tokens.js";
import log from "./log.js";
import sqlInit from "./sql_init.js";
import { isElectron } from "./utils.js";
import passwordEncryptionService from "./encryption/password_encryption.js";
import config from "./config.js";
import passwordService from "./encryption/password.js";
import totp from "./totp.js";
import openID from "./open_id.js";
import options from "./options.js";
import attributes from "./attributes.js";
import type { NextFunction, Request, Response } from "express";

const noAuthentication = config.General && config.General.noAuthentication === true;

function checkAuth(req: Request, res: Response, next: NextFunction) {
    if (!sqlInit.isDbInitialized()) {
        res.redirect('setup');
    }

    const currentTotpStatus = totp.isTotpEnabled();
    const currentSsoStatus = openID.isOpenIDEnabled();
    const lastAuthState = req.session.lastAuthState || { totpEnabled: false, ssoEnabled: false };

    if (isElectron) {
        next();
        return;
    } else if (currentTotpStatus !== lastAuthState.totpEnabled || currentSsoStatus !== lastAuthState.ssoEnabled) {
        req.session.destroy((err) => {
            if (err) console.error('Error destroying session:', err);
            res.redirect('login');
        });
        return;
    } else if (currentSsoStatus) {
        if (req.oidc?.isAuthenticated() && req.session.loggedIn) {
            next();
            return;
        }
        res.redirect('login');
        return;
    } else if (!req.session.loggedIn && !noAuthentication) {

        // cannot use options.getOptionBool currently => it will throw an error on new installations
        // TriliumNextTODO: look into potentially creating an getOptionBoolOrNull instead
        const hasRedirectBareDomain = options.getOptionOrNull("redirectBareDomain") === "true";

        if (hasRedirectBareDomain) {
            // Check if any note has the #shareRoot label
            const shareRootNotes = attributes.getNotesWithLabel("shareRoot");
            if (shareRootNotes.length === 0) {
                // should this be a translation string?
                res.status(404).json({ message: "Share root not found. Please set up a note with #shareRoot label first." });
                return;
            }

            // Get the configured share path
            const sharePath = options.getOption("sharePath") || '/share';

            // Check if we're already at the share path to prevent redirect loops
            if (req.path === sharePath || req.path.startsWith(`${sharePath}/`)) {
                log.info(`checkAuth: Already at share path, skipping redirect. Path: ${req.path}, SharePath: ${sharePath}`);
                next();
                return;
            }

            // Redirect to the share path
            log.info(`checkAuth: Redirecting to share path. From: ${req.path}, To: ${sharePath}`);
            res.redirect(`${sharePath}/`);
        } else {
            res.redirect("login");
        }
    } else {
        next();
    }
}

/**
 * Checks if a URL path might be a shared note ID when clean URLs are enabled
 */
function checkCleanUrl(req: Request, res: Response, next: NextFunction) {
    // Only process if not logged in and clean URLs are enabled
    if (!req.session.loggedIn && !isElectron && !noAuthentication &&
        options.getOptionBool("redirectBareDomain") &&
        options.getOptionBool("useCleanUrls")) {

        // Get the configured share path
        const sharePath = options.getOption("sharePath") || '/share';

        // Get path without leading slash
        const path = req.path.substring(1);

        // Skip processing for known routes, empty paths, and paths that already start with sharePath
        if (!path ||
            path === 'login' ||
            path === 'setup' ||
            path.startsWith('api/') ||
            req.path === sharePath ||
            req.path.startsWith(`${sharePath}/`)) {
            log.info(`checkCleanUrl: Skipping redirect. Path: ${req.path}, SharePath: ${sharePath}`);
            next();
            return;
        }

        // If sharePath is just '/', we don't need to redirect
        if (sharePath === '/') {
            log.info(`checkCleanUrl: SharePath is root, skipping redirect. Path: ${req.path}`);
            next();
            return;
        }

        // Redirect to the share URL with this ID
        log.info(`checkCleanUrl: Redirecting to share path. From: ${req.path}, To: ${sharePath}/${path}`);
        res.redirect(`${sharePath}/${path}`);
    } else {
        next();
    }
}

/**
 * Middleware for API authentication - works for both sync and normal API
 */
function checkApiAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.loggedIn && !noAuthentication) {
        reject(req, res, "Logged in session not found");
    } else {
        next();
    }
}



// for electron things which need network stuff
//  currently, we're doing that for file upload because handling form data seems to be difficult
function checkApiAuthOrElectron(req: Request, res: Response, next: NextFunction) {
    if (!req.session.loggedIn && !isElectron && !noAuthentication) {
        reject(req, res, "Logged in session not found");
    } else {
        next();
    }
}

function checkAppInitialized(req: Request, res: Response, next: NextFunction) {
    if (!sqlInit.isDbInitialized()) {
        res.redirect("setup");
    } else {
        next();
    }
}

function checkPasswordSet(req: Request, res: Response, next: NextFunction) {
    if (!isElectron && !passwordService.isPasswordSet()) {
        res.redirect("set-password");
    } else {
        next();
    }
}

function checkPasswordNotSet(req: Request, res: Response, next: NextFunction) {
    if (!isElectron && passwordService.isPasswordSet()) {
        res.redirect("login");
    } else {
        next();
    }
}

function checkAppNotInitialized(req: Request, res: Response, next: NextFunction) {
    if (sqlInit.isDbInitialized()) {
        reject(req, res, "App already initialized.");
    } else {
        next();
    }
}

function checkEtapiToken(req: Request, res: Response, next: NextFunction) {
    if (etapiTokenService.isValidAuthHeader(req.headers.authorization)) {
        next();
    } else {
        reject(req, res, "Token not found");
    }
}

function reject(req: Request, res: Response, message: string) {
    log.info(`${req.method} ${req.path} rejected with 401 ${message}`);

    res.setHeader("Content-Type", "text/plain").status(401).send(message);
}

function checkCredentials(req: Request, res: Response, next: NextFunction) {
    if (!sqlInit.isDbInitialized()) {
        res.setHeader("Content-Type", "text/plain").status(400).send("Database is not initialized yet.");
        return;
    }

    if (!passwordService.isPasswordSet()) {
        res.setHeader("Content-Type", "text/plain").status(400).send("Password has not been set yet. Please set a password and repeat the action");
        return;
    }

    const header = req.headers["trilium-cred"] || "";
    if (typeof header !== "string") {
        res.setHeader("Content-Type", "text/plain").status(400).send("Invalid data type for trilium-cred.");
        return;
    }

    const auth = Buffer.from(header, "base64").toString();
    const colonIndex = auth.indexOf(":");
    const password = colonIndex === -1 ? "" : auth.substr(colonIndex + 1);
    // username is ignored

    if (!passwordEncryptionService.verifyPassword(password)) {
        res.setHeader("Content-Type", "text/plain").status(401).send("Incorrect password");
    } else {
        next();
    }
}

export default {
    checkAuth,
    checkCleanUrl,
    checkApiAuth,
    checkAppInitialized,
    checkPasswordSet,
    checkPasswordNotSet,
    checkAppNotInitialized,
    checkApiAuthOrElectron,
    checkEtapiToken,
    checkCredentials
};
