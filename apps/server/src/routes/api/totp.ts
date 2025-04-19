import totpService from '../../services/totp.js';

function generateTOTPSecret() {
    return totpService.createSecret();
}

function getTOTPStatus() {
    return { success: true, message: totpService.isTotpEnabled(), set: totpService.checkForTotpSecret() };
}

function getSecret() {
    return totpService.getTotpSecret();
}

export default {
    generateSecret: generateTOTPSecret,
    getTOTPStatus,
    getSecret
};