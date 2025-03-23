const child_process = require("child_process");
const SIGN_EXECUTABLE = "C:\\ev_signer_trilium\\ev_signer_trilium.exe";

module.exports = function (filePath) {
    const command = `${SIGN_EXECUTABLE} --executable "${filePath}"`;
    console.log(`> ${command}`);
    child_process.execSync(command);
}