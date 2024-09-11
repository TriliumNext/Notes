"use strict";

import utils from "../services/utils.js";
import optionService from "../services/options.js";
import myScryptService from "../services/encryption/my_scrypt.js";
import log from "../services/log.js";
import passwordService from "../services/encryption/password.js";
import assetPath from "../services/asset_path.js";
import appPath from "../services/app_path.js";
import ValidationError from "../errors/validation_error.js";
import { Request, Response } from 'express';
import { AppRequest } from './route-interface.js';
import recoveryCodeService from '../services/encryption/recovery_codes.js';
import openIDService from '../services/open_id.js';
import openIDEncryption from '../services/encryption/open_id_encryption.js';
import totp from '../services/totp.js';
import open_id from '../services/open_id.js';

function loginPage(req: Request, res: Response) {
    if (open_id.isOpenIDEnabled()) {
      res.redirect('/authenticate');
    } else {
      res.render('login', {
        failedAuth: false,
        totpEnabled: totp.isTotpEnabled(),
        assetPath: assetPath,
        appPath: appPath,
      });
    }
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
        if (totp.isTotpEnabled()){
            if (!verifyTOTP(guessedTotp)) {
            sendLoginError(req, res);
            return;
            }
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
        sendLoginError(req, res);
    }
}

function verifyTOTP(guessedToken: string) {
    if (totp.validateTOTP(guessedToken)) return true;
  
    const recoveryCodeValidates = recoveryCodeService.verifyRecoveryCode(guessedToken);
  
    return recoveryCodeValidates;
}

function verifyPassword(guessedPassword: string) {
    const hashed_password = utils.fromBase64(optionService.getOption('passwordVerificationHash'));

    const guess_hashed = myScryptService.getVerificationHash(guessedPassword);

    return guess_hashed.equals(hashed_password);
}

function sendLoginError(req: AppRequest, res: Response) {
    // note that logged IP address is usually meaningless since the traffic should come from a reverse proxy
    if ( totp.isTotpEnabled( )){
        log.info(`WARNING: Wrong password or TOTP from ${req.ip}, rejecting.`);
    }else{
        log.info(`WARNING: Wrong password from ${req.ip}, rejecting.`);
    }
  
    res.status(401).render('login', {
      failedAuth: true,
      totpEnabled: optionService.getOption('totpEnabled') && totp.checkForTotSecret(),
      assetPath: assetPath,
    });
}

function logout(req: AppRequest, res: Response) {
    req.session.regenerate(() => {
        req.session.loggedIn = false;
        if (openIDService.isOpenIDEnabled() && openIDEncryption.isSubjectIdentifierSaved()) {
            res.oidc.logout({ returnTo: '/authenticate' });
        } else res.redirect('login');
    });

}

export default {
    loginPage,
    setPasswordPage,
    setPassword,
    login,
    logout
};
