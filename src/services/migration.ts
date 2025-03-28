import backupService from "./backup.js";
import sql from "./sql.js";
import fs from "fs-extra";
import log from "./log.js";
import { crash } from "./utils.js";
import resourceDir from "./resource_dir.js";
import appInfo from "./app_info.js";
import cls from "./cls.js";
import { t } from "i18next";

interface MigrationInfo {
    dbVersion: number;
    name: string;
    file: string;
    type: "sql" | "js" | "ts" | string;
    /**
     * Contains the JavaScript/TypeScript migration as a callback method that must be called to trigger the migration.
     * The method cannot be async since it runs in an SQL transaction.
     * For SQL migrations, this value is falsy.
     */
    module?: () => void;
}

async function migrate() {
    const currentDbVersion = getDbVersion();

    if (currentDbVersion < 214) {
        await crash(t("migration.old_version"));
        return;
    }

    // backup before attempting migration
    await backupService.backupNow(
        // creating a special backup for version 0.60.4, the changes in 0.61 are major.
        currentDbVersion === 214 ? `before-migration-v060` : "before-migration"
    );

    const migrations = await prepareMigrations(currentDbVersion);
    migrations.sort((a, b) => a.dbVersion - b.dbVersion);

    // all migrations are executed in one transaction - upgrade either succeeds, or the user can stay at the old version
    // otherwise if half of the migrations succeed, user can't use any version - DB is too "new" for the old app,
    // and too old for the new app version.

    cls.setMigrationRunning(true);

    sql.transactional(() => {
        for (const mig of migrations) {
            try {
                log.info(`Attempting migration to version ${mig.dbVersion}`);

                executeMigration(mig);

                sql.execute(
                    `UPDATE options
                            SET value = ?
                            WHERE name = ?`,
                    [mig.dbVersion.toString(), "dbVersion"]
                );

                log.info(`Migration to version ${mig.dbVersion} has been successful.`);
            } catch (e: any) {
                console.error(e);
                crash(t("migration.error_message", { version: mig.dbVersion, stack: e.stack }));
                break; // crash() is sometimes async
            }
        }
    });

    if (currentDbVersion === 214) {
        // special VACUUM after the big migration
        log.info("VACUUMing database, this might take a while ...");
        sql.execute("VACUUM");
    }
}

async function prepareMigrations(currentDbVersion: number): Promise<MigrationInfo[]> {
    const migrationFiles = fs.readdirSync(resourceDir.MIGRATIONS_DIR) ?? [];
    const migrations: MigrationInfo[] = [];
    for (const file of migrationFiles) {
        const match = file.match(/^([0-9]{4})__([a-zA-Z0-9_ ]+)\.(sql|js|ts)$/);
        if (!match) {
            continue;
        }

        const dbVersion = parseInt(match[1]);
        if (dbVersion > currentDbVersion) {
            const name = match[2];
            const type = match[3];

            const migration: MigrationInfo = {
                dbVersion: dbVersion,
                name: name,
                file: file,
                type: type
            };

            if (type === "js" || type === "ts") {
                // Due to ESM imports, the migration file needs to be imported asynchronously and thus cannot be loaded at migration time (since migration is not asynchronous).
                // As such we have to preload the ESM.
                // Going back to the original approach but making it webpack-compatible
                const importPath = `../../db/migrations/${file}`;
                migration.module = (await import(importPath)).default;
            }

            migrations.push(migration);
        }
    }
    return migrations;
}

function executeMigration(mig: MigrationInfo) {
    if (mig.module) {
        console.log("Migration with JS module");
        mig.module();
    } else if (mig.type === "sql") {
        const migrationSql = fs.readFileSync(`${resourceDir.MIGRATIONS_DIR}/${mig.file}`).toString("utf8");

        console.log(`Migration with SQL script: ${migrationSql}`);

        sql.executeScript(migrationSql);
    } else {
        throw new Error(`Unknown migration type '${mig.type}'`);
    }
}

function getDbVersion() {
    return parseInt(sql.getValue("SELECT value FROM options WHERE name = 'dbVersion'"));
}

function isDbUpToDate() {
    const dbVersion = getDbVersion();

    const upToDate = dbVersion >= appInfo.dbVersion;

    if (!upToDate) {
        log.info(`App db version is ${appInfo.dbVersion}, while db version is ${dbVersion}. Migration needed.`);
    }

    return upToDate;
}

async function migrateIfNecessary() {
    const currentDbVersion = getDbVersion();

    if (currentDbVersion > appInfo.dbVersion && process.env.TRILIUM_IGNORE_DB_VERSION !== "true") {
        await crash(t("migration.wrong_db_version", { version: currentDbVersion, targetVersion: appInfo.dbVersion }));
    }

    if (!isDbUpToDate()) {
        await migrate();
    }
}

export default {
    migrateIfNecessary,
    isDbUpToDate
};
