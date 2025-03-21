// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    async function validatorHtml(text, options) {
        const result = /<script[^>]*>([\s\S]+)<\/script>/ig.exec(text);

        if (result !== null) {
            // preceding code is copied over but any (non-newline) character is replaced with space
            // this will preserve line numbers etc.
            const prefix = text.substr(0, result.index).replace(/./g, " ");

            const js = prefix + result[1];

            return await validatorJavaScript(js, options);
        }

        return [];
    }

    async function validatorJavaScript(text, options) {
        if (glob.isMobile()
            || glob.getActiveContextNote() == null
            || glob.getActiveContextNote().mime === 'application/json') {
            // eslint doesn't seem to validate pure JSON well
            return [];
        }

        if (text.length > 20000) {
            console.log("Skipping linting because of large size: ", text.length);

            return [];
        }

        const errors = await glob.linter(text, glob.getActiveContextNote().mime);

        console.log(errors);

        const result = [];
        if (errors) {
            parseErrors(errors, result);
        }

        return result;
    }

    CodeMirror.registerHelper("lint", "javascript", validatorJavaScript);
    CodeMirror.registerHelper("lint", "html", validatorHtml);

    function parseErrors(errors, output) {
        for (const error of errors) {
            const startLine = error.line - 1;
            const endLine = error.endLine !== undefined ? error.endLine - 1 : startLine;
            const startCol = error.column - 1;
            const endCol = error.endColumn !== undefined ? error.endColumn - 1 : startCol + 1;

            output.push({
                message: error.message,
                severity: error.severity === 1 ? "warning" : "error",
                from: CodeMirror.Pos(startLine, startCol),
                to: CodeMirror.Pos(endLine, endCol)
            });
        }
    }
});
