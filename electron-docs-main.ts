import cls from "./src/services/cls.js";
import sql_init from "./src/services/sql_init.js";

async function startElectron() {
    await import("./electron-main.js");
}

async function initializeDb() {
    return new Promise<void>((resolve) => {
        cls.init(async () => {
            await sql_init.createInitialDatabase();
            sql_init.setDbAsInitialized();
            resolve();
        });
    })
}

async function main() {
    if (!sql_init.isDbInitialized()) {
        initializeDb();
    }

    await startElectron();
}

await main();
