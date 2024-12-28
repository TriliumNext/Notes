import chokidar from "chokidar";
import fs from "fs";
import path from "path";

const emptyCallback = () => {};

function onFileChanged(sourceFile: string) {
    const destFile = path.join("dist", sourceFile);
    console.log(`${sourceFile} -> ${destFile}`);
    fs.copyFile(sourceFile, destFile, emptyCallback);
}

const sourceDir = "src/public";

chokidar
    .watch(sourceDir)
    .on("change", onFileChanged);
console.log(`Watching for changes to ${sourceDir}...`);
