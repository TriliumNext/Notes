const child_process = require("child_process");
const fs = require("fs");
const { default: path } = require("path");

module.exports = function (filePath) {
    const { WINDOWS_SIGN_EXECUTABLE } = process.env;

    const stats = fs.lstatSync(filePath);
    console.log(filePath, stats);

    if (!WINDOWS_SIGN_EXECUTABLE) {
        console.warn("[Sign] Skip signing due to missing environment variable.");
        return;
    }

    const outputDir = path.join(__dirname, "sign");
    console.log(path.resolve("Output dir is ", outputDir));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.copyFileSync(sourcePath, destPath);

    const command = `${WINDOWS_SIGN_EXECUTABLE} --executable "${filePath}"`;
    console.log(`[Sign] ${command}`);

    const output = child_process.execSync(command);
    console.log(`[Sign] ${output}`);
}