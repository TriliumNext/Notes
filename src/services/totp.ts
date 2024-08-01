'use strict';

import {Totp} from 'time2fa';

export function getTotpSecret() {
    return process.env.TOTP_SECRET;
}

export function checkForTotSecret() {
    if (process.env.TOTP_SECRET !== undefined) return true;
    else return false;
}

export function validateTOTP(guessedPasscode: string) {
    if (process.env.TOTP_SECRET === undefined) return false;

    try {
        const valid = Totp.validate({
            passcode: guessedPasscode,
            secret: process.env.TOTP_SECRET.trim()
        });
        return valid;
    } catch (e) {
        return false;
    }
}