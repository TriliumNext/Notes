'use strict';

function getTotpSecret() {
    return process.env.TOTP_SECRET;
}

function checkForTotSecret() {
    if (process.env.TOTP_SECRET !== undefined) return true;
    else return false;
}

export = {getTotpSecret, checkForTotSecret};
