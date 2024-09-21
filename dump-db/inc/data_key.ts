import crypto from 'crypto';
import sql from './sql.js';
import decryptService from './decrypt.js';

function getDataKey(password: any) {
    if (!password) {
        return null;
    }

    try {
        const passwordDerivedKey = getPasswordDerivedKey(password);

        const encryptedDataKey = getOption('encryptedDataKey');

        const decryptedDataKey = decryptService.decrypt(passwordDerivedKey, encryptedDataKey, 16);

        return decryptedDataKey;
    }
    catch (e: any) {
        throw new Error(`Cannot read data key, the entered password might be wrong. The underlying error: '${e.message}', stack:\n${e.stack}`);
    }
}

function getPasswordDerivedKey(password: any) {
    const salt = getOption('passwordDerivedKeySalt');

    return getScryptHash(password, salt);
}

function getScryptHash(password: any, salt: any) {
    const hashed = crypto.scryptSync(password, salt, 32,
        { N: 16384, r: 8, p: 1 });

    return hashed;
}

function getOption(name: string) {
    return sql.getValue("SELECT value FROM options WHERE name = ?", [name]);
}

export default {
    getDataKey
};
