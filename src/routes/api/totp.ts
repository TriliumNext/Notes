import options  from '../../services/options.js';
import {generateSecret} from 'time2fa';

export function generateTOTPSecret() {
    return {success: 'true', message: generateSecret()};
}

function getTotpEnabled() {
    if (process.env.TOTP_ENABLED === undefined) return false;
    if (process.env.TOTP_ENABLED.toLocaleLowerCase() !== 'true') return false;

    return true;
}

export function getTOTPStatus() {
    const totpEnabled = options.getOptionBool('totpEnabled');
    return {success: 'true', message: totpEnabled, enabled: getTotpEnabled()};
}

export function enableTOTP() {
    if (!getTotpEnabled()) return {success: 'false'};

    options.setOption('totpEnabled', true);
    options.setOption('oAuthEnabled', false);
    return {success: 'true'};
}

export function disableTOTP() {
    options.setOption('totpEnabled', false);
    return {success: true};
}

export function getSecret() {
    return process.env.TOTP_SECRET;
}