import server from "./server.js";

function enableProtectedSession() {
    glob.isProtectedSessionAvailable = true;

    touchProtectedSession();
}

async function resetProtectedSession() {
    await server.post("logout/protected");
}

function isProtectedSessionAvailable() {
    return glob.isProtectedSessionAvailable;
}

async function touchProtectedSession() {
    if (isProtectedSessionAvailable()) {
        await server.post("login/protected/touch");
    }
}

// TODO: Replace with fnote when ported.
interface FNote {
    isProtected: boolean;    
}
function touchProtectedSessionIfNecessary(note: FNote) {
    if (note && note.isProtected && isProtectedSessionAvailable()) {
        touchProtectedSession();
    }
}

export default {
    enableProtectedSession,
    resetProtectedSession,
    isProtectedSessionAvailable,
    touchProtectedSession,
    touchProtectedSessionIfNecessary
};
