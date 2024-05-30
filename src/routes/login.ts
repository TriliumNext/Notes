"use strict";

import utils = require('../services/utils');
import optionService = require('../services/options');
import myScryptService = require('../services/encryption/my_scrypt');
import log = require('../services/log');
import passwordService = require('../services/encryption/password');
import totp_secret = require('../services/totp');
import recoveryCodeService = require('../services/encryption/recovery_codes');
import openIDService = require('../services/open_id');
import openID = require('../services/encryption/open_id');
import assetPath = require('../services/asset_path');
import appPath = require('../services/app_path');
import ValidationError = require('../errors/validation_error');
import { Request, Response } from 'express';
import { AppRequest } from './route-interface';
const speakeasy = require('speakeasy');

function loginPage(req: Request, res: Response) {
    res.render('login', {
        failedAuth: false,
        totpEnabled: optionService.getOptionBool('totpEnabled')
            && totp_secret.checkForTotSecret(),
        assetPath: assetPath,
        appPath: appPath
    });
}

function setPasswordPage(req: Request, res: Response) {
    res.render('set_password', {
        error: false,
        assetPath: assetPath,
        appPath: appPath
    });
}

function setPassword(req: Request, res: Response) {
    if (passwordService.isPasswordSet()) {
        throw new ValidationError("Password has been already set");
    }

    let {password1, password2} = req.body;
    password1 = password1.trim();
    password2 = password2.trim();

    let error;

    if (password1 !== password2) {
        error = "Entered passwords don't match.";
    } else if (password1.length < 4) {
        error = "Password must be at least 4 characters long.";
    }

    if (error) {
        res.render('set_password', {
            error,
            assetPath: assetPath
        });
        return;
    }

    passwordService.setPassword(password1);

    res.redirect('login');
}

function login(req: AppRequest, res: Response) {
    const guessedPassword = req.body.password;
    const guessedTotp = req.body.token;

    if (verifyPassword(guessedPassword)) {

        if (!verifyPassword(guessedPassword)) {
            sendLoginError(req, res);
            return;
        }

        if (optionService.getOptionBool('totpEnabled') && totp_secret.checkForTotSecret())
            if (!verifyTOTP(guessedTotp)) {
                sendLoginError(req, res);
                return;
            }

        
        const rememberMe = req.body.rememberMe;

        req.session.regenerate(() => {
            if (rememberMe) {
                req.session.cookie.maxAge = 21 * 24 * 3600000;  // 3 weeks
            } else {
                req.session.cookie.expires = null;
            }

            req.session.loggedIn = true;
            res.redirect('.');
        });
    }
    else {
        // note that logged IP address is usually meaningless since the traffic should come from a reverse proxy
        log.info(`WARNING: Wrong password from ${req.ip}, rejecting.`);

        res.status(401).render('login', {
            failedAuth: true,
            assetPath: assetPath
        });
    }
}



function sendLoginError(req: AppRequest, res: Response) {
    // note that logged IP address is usually meaningless since the traffic should come from a reverse proxy
    log.info(`WARNING: Wrong password or TOTP from ${req.ip}, rejecting.`);

    res.status(401).render('login', {
        failedAuth: true,
        totpEnabled: optionService.getOption('totpEnabled') && totp_secret.checkForTotSecret(),
        assetPath: assetPath,
    });
}

function verifyTOTP(guessedToken: string) {
    const tokenValidates = speakeasy.totp.verify({
        secret: totp_secret.getTotpSecret(),
        encoding: 'base32',
        token: guessedToken,
        window: 1,
    });

    if (tokenValidates) 
        return true;

    const recoveryCodeValidates = recoveryCodeService.verifyRecoveryCode(guessedToken);

    return recoveryCodeValidates;
}

function verifyPassword(guessedPassword: string) {
    const hashed_password = utils.fromBase64(optionService.getOption('passwordVerificationHash'));

    const guess_hashed = myScryptService.getVerificationHash(guessedPassword);

    return guess_hashed.equals(hashed_password);
}

function logout(req: AppRequest, res: Response) {
    req.session.regenerate(() => {
        req.session.loggedIn = false;

        if (openIDService.isOpenIDEnabled() && openID.isSubjectIdentifierSaved()) 
            res.oidc.logout({});
        else 
            res.redirect('login');
    });

}

export = {
    loginPage,
    setPasswordPage,
    setPassword,
    login,
    logout
};
