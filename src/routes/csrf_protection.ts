import { doubleCsrf } from "csrf-csrf";
import sessionSecret from "../services/session_secret.js";
import { isElectron } from "../services/utils.js";
import config from "../services/config.js";

const doubleCsrfUtilities = doubleCsrf({
    getSecret: () => sessionSecret,
    cookieOptions: {
        path: config.Session.cookiePath,
        secure: false,
        sameSite: "strict",
        httpOnly: !isElectron // set to false for Electron, see https://github.com/TriliumNext/Notes/pull/966
    },
    cookieName: "_csrf"
});

export const { generateToken, doubleCsrfProtection } = doubleCsrfUtilities;
