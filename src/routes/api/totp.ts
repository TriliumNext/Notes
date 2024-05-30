import options = require('../../services/options');
const speakeasy = require('speakeasy');

function generateSecret() {
    return {success: 'true', message: speakeasy.generateSecret().base32};
}

function getTotpEnabled() {
    if (process.env.TOTP_ENABLED === undefined) return false;
    if (process.env.TOTP_ENABLED.toLocaleLowerCase() !== 'true') return false;

    return true;
}

function getTOTPStatus() {
    const totpEnabled = options.getOptionBool('totpEnabled');
    return {success: 'true', message: totpEnabled, enabled: getTotpEnabled()};
}

function enableTOTP() {
    if (!getTotpEnabled()) return {success: 'false'};

    options.setOption('totpEnabled', true);
    options.setOption('oAuthEnabled', false);
    return {success: 'true'};
}

function disableTOTP() {
    options.setOption('totpEnabled', false);
    return {success: true};
}

function getSecret() {
    return process.env.TOTP_SECRET;
}

export = {
    generateSecret,
    getTOTPStatus,
    enableTOTP,
    disableTOTP,
    getSecret,
};
