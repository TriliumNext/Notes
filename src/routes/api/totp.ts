import {generateSecret} from 'time2fa';

function generateTOTPSecret() {
    return {success: 'true', message: generateSecret()};
}

function getTotpEnabled() {
    if (process.env.TOTP_ENABLED === undefined) {
        return false;
    }
    if (process.env.TOTP_ENABLED.toLocaleLowerCase() !== 'true') {
        return false;
    }

    return true;
}

function getTOTPStatus() {
    const totpEnabled = getTotpEnabled();
    return {success: true, message: totpEnabled, enabled: getTotpEnabled()};
}

function getSecret() {
    return process.env.TOTP_SECRET;
}

export default {
    generateSecret: generateTOTPSecret,
    getTOTPStatus,
    getSecret
};