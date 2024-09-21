import http from "http";
import ini from "ini";
import fs from "fs";
import dataDir from './src/services/data_dir.js';
const config = ini.parse(fs.readFileSync(dataDir.CONFIG_INI_PATH, 'utf-8'));

if (config.Network.https) {
    // built-in TLS (terminated by trilium) is not supported yet, PRs are welcome
    // for reverse proxy terminated TLS this will works since config.https will be false
    process.exit(0);
}

import port from './src/services/port.js';
import host from './src/services/host.js';

const options: http.RequestOptions = { timeout: 2000 };

const callback: (res: http.IncomingMessage) => void = res => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
};

let request;

if (port !== 0) { // TCP socket.
    const url = `http://${host}:${port}/api/health-check`;
    request = http.request(url, options, callback);
} else { // Unix socket.
    options.socketPath = host;
    options.path = '/api/health-check';
    request = http.request(options, callback);
}

request.on("error", err => {
    console.log("ERROR");
    process.exit(1);
});
request.end();
