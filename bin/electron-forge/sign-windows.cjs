const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const LOG_LOCATION = "c:\\ev_signer_trilium\\ev_signer_trilium.err.log";
const { WINDOWS_SIGN_EXECUTABLE } = process.env;

module.exports = function (sourcePath) {
    if (!WINDOWS_SIGN_EXECUTABLE) {
        console.warn("[Sign] Skip signing due to missing environment variable.");
        return;
    }

    const outputDir = path.join(__dirname, "sign");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    try {
        const destPath = path.resolve(path.join(outputDir, path.basename(sourcePath)));
        fs.copyFileSync(sourcePath, destPath);
        console.log(["[Sign] Copying file to signing location", destPath].join(" "));
        const command = `${WINDOWS_SIGN_EXECUTABLE} --executable "${sourcePath}"`;
        console.log(`[Sign] ${command}`);

        child_process.execSync(command);
    } catch (e) {
        console.error("[Sign] Got error while signing " + e.output.toString("utf-8"));
        printSigningErrorLogs(sourcePath);
        process.exit(2); 
    }
}

function printSigningErrorLogs(sourcePath) {
  console.log("Platform: ", process.platform);
  console.log("CPU archi:", process.arch);
  console.log("DLL archi: ", getDllArchitectureFromFile(sourcePath));
  console.log("Signer archi: ", getDllArchitectureFromFile(WINDOWS_SIGN_EXECUTABLE));

  if (!fs.existsSync(LOG_LOCATION)) {
    console.warn("[Sign] No debug log file found.");
    return;
  }

  const logContent = fs.readFileSync(LOG_LOCATION, "utf-8");
  console.error("[Sign] Debug log content:\n" + logContent);
}

function getDllArchitectureFromFile(filePath) {
    const buffer = fs.readFileSync(filePath);

    // Check for MZ header
    if (buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
      return 'Not a PE file (missing MZ header)';
    }
  
    // Offset to PE header
    const peHeaderOffset = buffer.readUInt32LE(0x3C);
  
    // Confirm PE signature
    const peSig = buffer.toString('utf8', peHeaderOffset, peHeaderOffset + 4);
    if (peSig !== 'PE\u0000\u0000') {
      return 'Invalid PE header';
    }
  
    // Machine field is 2 bytes at PE header + 4
    const machine = buffer.readUInt16LE(peHeaderOffset + 4);
  
    const archMap = {
      0x014c: 'x86 (32-bit)',
      0x8664: 'x64 (64-bit)',
      0x01c4: 'ARM (32-bit)',
      0xaa64: 'ARM64',
    };
  
    return archMap[machine] || `Unknown (0x${machine.toString(16)})`;
  }