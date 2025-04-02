const child_process = require("child_process");

module.exports = function (filePath) {
    const { WINDOWS_SIGN_EXECUTABLE } = process.env;

    if (!WINDOWS_SIGN_EXECUTABLE) {
        console.warn("[Sign] Skip signing due to missing environment variable.");
        return;
    }

    const command = `${WINDOWS_SIGN_EXECUTABLE} --executable "${filePath}"`;
    console.log(`[Sign] ${command}`);
    child_process.execSync(command);
}