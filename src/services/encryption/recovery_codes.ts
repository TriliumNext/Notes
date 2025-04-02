import sql from '../sql.js';
import optionService from '../options.js';
import crypto from 'crypto';

function isRecoveryCodeSet() {
    return optionService.getOptionBool('encryptedRecoveryCodes');
}

function setRecoveryCodes(recoveryCodes: string) {
    const iv = crypto.randomBytes(16);
    const securityKey = crypto.randomBytes(32);
    const cipher = crypto.createCipheriv('aes-256-cbc', securityKey, iv);
    let encryptedRecoveryCodes = cipher.update(recoveryCodes, 'utf-8', 'hex');

    sql.transactional(() => {
        optionService.setOption('recoveryCodeInitialVector', iv.toString('hex'));
        optionService.setOption('recoveryCodeSecurityKey', securityKey.toString('hex'));
        optionService.setOption('recoveryCodesEncrypted', encryptedRecoveryCodes + cipher.final('hex'));
        optionService.setOption('encryptedRecoveryCodes', 'true');
        return true;
    });
    return false;
}

function getRecoveryCodes() {
    if (!isRecoveryCodeSet()) {
        return []
    }

    return sql.transactional(() => {
        const iv = Buffer.from(optionService.getOption('recoveryCodeInitialVector'), 'hex');
        const securityKey = Buffer.from(optionService.getOption('recoveryCodeSecurityKey'), 'hex');
        const encryptedRecoveryCodes = optionService.getOption('recoveryCodesEncrypted');

        const decipher = crypto.createDecipheriv('aes-256-cbc', securityKey, iv);
        const decryptedData = decipher.update(encryptedRecoveryCodes, 'hex', 'utf-8');

        const decryptedString = decryptedData + decipher.final('utf-8');
        return decryptedString.split(',');
    });
}

function removeRecoveryCode(usedCode: string) {
    const oldCodes: string[] = getRecoveryCodes();
    const today = new Date();
    oldCodes[oldCodes.indexOf(usedCode)] = today.toJSON().replace(/-/g, '/');
    setRecoveryCodes(oldCodes.toString());
}

function verifyRecoveryCode(recoveryCodeGuess: string) {
    const recoveryCodeRegex = RegExp(/^.{22}==$/gm);
    if (!recoveryCodeRegex.test(recoveryCodeGuess)) {
        return false;
    }

    const recoveryCodes = getRecoveryCodes();
    var loginSuccess = false;
    recoveryCodes.forEach((recoveryCode: string) => {
        if (recoveryCodeGuess === recoveryCode) {
            removeRecoveryCode(recoveryCode);
            loginSuccess = true;
            return;
        }
    });
    return loginSuccess;
}

export default {
    setRecoveryCodes,
    getRecoveryCodes,
    verifyRecoveryCode,
    isRecoveryCodeSet
};