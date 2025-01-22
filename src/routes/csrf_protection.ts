import { doubleCsrf } from "csrf-csrf";
import sessionSecret from "../services/session_secret.js";
import { isElectron } from "../services/utils.js";

const doubleCsrfUtilities = doubleCsrf({
    getSecret: () => sessionSecret,
    cookieOptions: {
        path: "", // empty, so cookie is valid only for the current path
        secure: false,
        sameSite: "strict",
        httpOnly: !isElectron // set to false for Electron, see https://github.com/TriliumNext/Notes/pull/966
    },
    cookieName: "_csrf"
});

export const { generateToken, doubleCsrfProtection } = doubleCsrfUtilities;
