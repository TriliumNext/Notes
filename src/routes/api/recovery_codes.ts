import recovery_codes from'../../services/encryption/recovery_codes.js';
import {Request} from 'express';
import {randomBytes} from 'crypto';

function setRecoveryCodes(req: Request) {
    const success = recovery_codes.setRecoveryCodes(req.body.recoveryCodes);
    return {success: success, message: 'Recovery codes set!'};
}

function veryifyRecoveryCode(req: Request) {
    const success = recovery_codes.verifyRecoveryCode(req.body.recovery_code_guess);

    return {success: success};
}

function checkForRecoveryKeys() {
    return {success
: true, keysExist: recovery_codes.isRecoveryCodeSet()};
}

function generateRecoveryCodes() {
    const recoveryKeys = [
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64'),
        randomBytes(16).toString('base64')
    ];

    recovery_codes.setRecoveryCodes(recoveryKeys.toString());

    return {success: true, recoveryCodes: recoveryKeys.toString()};
}

function getUsedRecoveryCodes() {
    return {
        success: true,
        usedRecoveryCodes: recovery_codes.getUsedRecoveryCodes().toString()
    };
}

export default {
    setRecoveryCodes,
    generateRecoveryCodes,
    veryifyRecoveryCode,
    checkForRecoveryKeys,
    getUsedRecoveryCodes
};