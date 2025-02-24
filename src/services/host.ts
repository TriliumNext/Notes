import config from "./config.js";
import { isElectron } from "./utils.js";

function getHost() {
    const envHost = process.env.TRILIUM_HOST;
    if (envHost && !isElectron) {
        return envHost;
    }

    return config["Network"]["host"] || "0.0.0.0";
}

export default getHost();
