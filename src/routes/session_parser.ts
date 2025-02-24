import session from "express-session";
import sessionFileStore from "session-file-store";
import sessionSecret from "../services/session_secret.js";
import dataDir from "../services/data_dir.js";
import config from "../services/config.js";
const FileStore = sessionFileStore(session);

const sessionParser = session({
    secret: sessionSecret,
    resave: false, // true forces the session to be saved back to the session store, even if the session was never modified during the request.
    saveUninitialized: false, // true forces a session that is "uninitialized" to be saved to the store. A session is uninitialized when it is new but not modified.
    cookie: {
        path: config.Session.cookiePath,
        httpOnly: true,
        maxAge: config.Session.cookieMaxAge * 1000 // needs value in milliseconds
    },
    name: "trilium.sid",
    store: new FileStore({
        ttl: config.Session.cookieMaxAge,
        path: `${dataDir.TRILIUM_DATA_DIR}/sessions`
    })
});

export default sessionParser;
