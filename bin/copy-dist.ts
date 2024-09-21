import fs from "fs-extra";
import path from "path";

const DEST_DIR = "./dist";
const DEST_DIR_SRC = path.join(DEST_DIR, "src");
const DEST_DIR_NODE_MODULES = path.join(DEST_DIR, "node_modules");

const VERBOSE = process.env.VERBOSE;

function log(...args) {
  if (VERBOSE) {
    console.log(args);
  }
}

async function copyNodeModuleFileOrFolder(source: string) {
  const adjustedSource = source.substring(13);
  const destination = path.join(DEST_DIR_NODE_MODULES, adjustedSource);

  log(`Copying ${source} to ${destination}`);
  await fs.ensureDir(path.dirname(destination));
  await fs.copy(source, destination);
}

const copy = async () => {
  for (const srcFile of fs.readdirSync("build")) {    
    const destFile = path.join(DEST_DIR, path.basename(srcFile));
    log(`Copying source ${srcFile} -> ${destFile}.`);
    fs.copySync(path.join("build", srcFile), destFile, { recursive: true });
  }

  const filesToCopy = ["config-sample.ini"];
  for (const file of filesToCopy) {
    log(`Copying ${file}`);
    await fs.copy(file, path.join(DEST_DIR, file));
  }

  const dirsToCopy = ["images", "libraries", "db"];
  for (const dir of dirsToCopy) {
    log(`Copying ${dir}`);
    await fs.copy(dir, path.join(DEST_DIR, dir));
  }

  const srcDirsToCopy = ["./src/public", "./src/views", "./build"];
  for (const dir of srcDirsToCopy) {
    log(`Copying ${dir}`);
    await fs.copy(dir, path.join(DEST_DIR_SRC, path.basename(dir)));
  }  

  const nodeModulesFile = [
    "node_modules/react/umd/react.production.min.js",
    "node_modules/react/umd/react.development.js",
    "node_modules/react-dom/umd/react-dom.production.min.js",
    "node_modules/react-dom/umd/react-dom.development.js",
    "node_modules/katex/dist/katex.min.js",
    "node_modules/katex/dist/contrib/mhchem.min.js",
    "node_modules/katex/dist/contrib/auto-render.min.js",
  ];

  for (const file of nodeModulesFile) {
    await copyNodeModuleFileOrFolder(file);
  }

  const nodeModulesFolder = [
    "node_modules/@excalidraw/excalidraw/dist/",
    "node_modules/katex/dist/",
    "node_modules/dayjs/",
    "node_modules/force-graph/dist/",
    "node_modules/boxicons/css/",
    "node_modules/boxicons/fonts/",
    "node_modules/mermaid/dist/",
    "node_modules/jquery/dist/",
    "node_modules/jquery-hotkeys/",
    "node_modules/print-this/",
    "node_modules/split.js/dist/",
    "node_modules/panzoom/dist/",
    "node_modules/i18next/",
    "node_modules/i18next-http-backend/",
    "node_modules/eslint/bin/",
    "node_modules/jsplumb/dist/",
    "node_modules/vanilla-js-wheel-zoom/dist/",
    "node_modules/mark.js/dist/",
    "node_modules/knockout/build/output/",
    "node_modules/normalize.css/",
    "node_modules/jquery.fancytree/dist/",
    "node_modules/bootstrap/dist/",
    "node_modules/autocomplete.js/dist/",
    "node_modules/codemirror/lib/",
    "node_modules/codemirror/addon/",
    "node_modules/codemirror/mode/",
    "node_modules/codemirror/keymap/",
    "node_modules/mind-elixir/dist/"
  ];

  for (const folder of nodeModulesFolder) {
    await copyNodeModuleFileOrFolder(folder);
  }
};

copy()
  .then(() => console.log("Copying complete!"))
  .catch((err) => console.error("Error during copy:", err));
