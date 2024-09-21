import Database, { Database as DatabaseType } from "better-sqlite3";

let dbConnection: DatabaseType;

const openDatabase = (documentPath: string) => { dbConnection = new Database(documentPath, { readonly: true }) };

const getRow = (query: string, params: string[] = []): Record<string, any> => dbConnection.prepare(query).get(params) as Record<string, any>;
const getRows = (query: string, params = []) => dbConnection.prepare(query).all(params);
const getValue = (query: string, params: string[] = []) => dbConnection.prepare(query).pluck().get(params);
const getColumn = (query: string, params: string[] = []) => dbConnection.prepare(query).pluck().all(params);

export default {
    openDatabase,
    getRow,
    getRows,
    getValue,
    getColumn
};
