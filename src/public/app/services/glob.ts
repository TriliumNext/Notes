import utils from "./utils.js";
import appContext from "../components/app_context.js";
import server from "./server.js";
import libraryLoader from "./library_loader.js";
import ws from "./ws.js";
import froca from "./froca.js";
import linkService from "./link.js";

function setupGlobs() {
    window.glob.isDesktop = utils.isDesktop;
    window.glob.isMobile = utils.isMobile;

    window.glob.getComponentByEl = el => appContext.getComponentByEl(el);
    window.glob.getHeaders = server.getHeaders;
    window.glob.getReferenceLinkTitle = href => linkService.getReferenceLinkTitle(href);
    window.glob.getReferenceLinkTitleSync = href => linkService.getReferenceLinkTitleSync(href);

    // required for ESLint plugin and CKEditor
    window.glob.getActiveContextNote = () => appContext.tabManager.getActiveContextNote();
    window.glob.requireLibrary = libraryLoader.requireLibrary;
    window.glob.ESLINT = libraryLoader.ESLINT;
    window.glob.appContext = appContext; // for debugging
    window.glob.froca = froca;
    window.glob.treeCache = froca; // compatibility for CKEditor builds for a while

    // for CKEditor integration (button on block toolbar)
    window.glob.importMarkdownInline = async () => appContext.triggerCommand("importMarkdownInline");

    window.onerror = function (msg, url, lineNo, columnNo, error) {
        const string = String(msg).toLowerCase();

        let message = "Uncaught error: ";

        if (string.includes("script error")) {
            message += 'No details available';
        } else {
            message += [
                `Message: ${msg}`,
                `URL: ${url}`,
                `Line: ${lineNo}`,
                `Column: ${columnNo}`,
                `Error object: ${JSON.stringify(error)}`,
                `Stack: ${error && error.stack}`
            ].join(', ');
        }

        ws.logError(message);

        return false;
    };

    window.addEventListener("unhandledrejection", (e) => {
        const string = e?.reason?.message?.toLowerCase();

        let message = "Uncaught error: ";

        if (string?.includes("script error")) {
            message += 'No details available';
        } else {
            message += [
                `Message: ${e.reason.message}`,
                `Line: ${e.reason.lineNumber}`,
                `Column: ${e.reason.columnNumber}`,
                `Error object: ${JSON.stringify(e.reason)}`,
                `Stack: ${e.reason && e.reason.stack}`
            ].join(', ');
        }

        ws.logError(message);

        return false;
    });

    for (const appCssNoteId of glob.appCssNoteIds || []) {
        libraryLoader.requireCss(`api/notes/download/${appCssNoteId}`, false);
    }

    utils.initHelpButtons($(window));

    $("body").on("click", "a.external", function () {
        window.open($(this).attr("href"), '_blank');

        return false;
    });
}

export default {
    setupGlobs
}
