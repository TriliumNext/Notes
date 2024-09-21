import config from "./config.js";
import utils from "./utils.js";

function getHost() {
    const envHost = process.env.TRILIUM_HOST;
    if (envHost && !utils.isElectron) {
        return envHost;
    }
    
    return config['Network']['host'] || '0.0.0.0';
}

export default getHost();