const child_process = require("child_process");
const SIGN_EXECUTABLE = "C:\\ev_signer_trilium\\ev_signer_trilium.exe";

module.exports = function (filePath) {
    console.log(`Path to file to sign: ${filePath}`);
    child_process.execSync(`${SIGN_EXECUTABLE} "${filePath}"`);
}
