import OpenIDError = require('../errors/open_id_error');
import {NextFunction, Request, Response} from 'express';
import openIDService = require('./encryption/open_id');
import options = require('./options');

function isOpenIDEnabled() {
    try {
        return options.getOptionBool('oAuthEnabled');
    } catch (e) {
        return false;
    }
}

function checkOpenIDRequirements() {
    if (process.env.OAUTH_ENABLED === undefined) return false;
    if (process.env.OAUTH_ENABLED.toLocaleLowerCase() !== 'true') return false;

    if (process.env.BASE_URL === undefined) throw new OpenIDError('BASE_URL is undefined in .env!');
    if (process.env.CLIENT_ID === undefined) throw new OpenIDError('CLIENT_ID is undefined in .env!');
    if (process.env.ISSUER_BASE_URL === undefined) throw new OpenIDError('ISSUER_BASE_URL is undefined in .env!');
    if (process.env.SECRET === undefined) throw new OpenIDError('SECRET is undefined in .env!');
    if (process.env.AUTH_0_LOGOUT === undefined) throw new OpenIDError('AUTH_0_LOGOUT is undefined in .env!');

    return true;
}

function enableOAuth() {
    if (!getOauthEnv()) return {success: false, message: 'OAuth Not Enabled'};

    options.setOption('oAuthEnabled', true);
    options.setOption('totpEnabled', false);

    return {success: true, message: 'OAuth Enabled'};
}

function disableOAuth() {
    options.setOption('oAuthEnabled', false);
    return {success: true, message: 'OAuth Disabled'};
}

function getOauthEnv() {
    if (process.env.OAUTH_ENABLED === undefined) return false;
    if (process.env.OAUTH_ENABLED.toLocaleLowerCase() !== 'true') return false;

    return true;
}

function getOAuthStatus() {
    return {success: true, message: options.getOptionBool('oAuthEnabled'), enabled: getOauthEnv()};
}

function authenticateUser(req: Request, res: Response, next: NextFunction) {
    // TODO: Add validity
    if (openIDService.isSubjectIdentifierSaved()) return {success: false, message: 'User ID already saved!'};

    if (req.oidc !== undefined) {
        const result = req.oidc
            .fetchUserInfo()
            .then((result) => {
                openIDService.saveSubjectIdentifier(result.sub);
                return {success: true, message: 'User ' + req.oidc.user?.name + ' saved!'};
            })
            .catch((result) => {
                return {success: false, message: 'Need to login again!'};
            });
        return result;
    } else {
        console.log('Access token Invalid!');
        return {success: false, message: 'Access token Invalid!'};
    }
}

function isTokenValid(req: Request, res: Response, next: NextFunction) {
    const userStatus = openIDService.isSubjectIdentifierSaved();

    if (req.oidc !== undefined) {
        const result = req.oidc
            .fetchUserInfo()
            .then((result) => {
                return {success: true, message: 'Token is valid', user: userStatus};
            })
            .catch((result) => {
                return {success: false, message: 'Token is not valid', user: userStatus};
            });
        return result;
    } else {
        return {success: false, message: 'Token not set up', user: userStatus};
    }
}

function checkAuth0Logout() {
    if (process.env.AUTH_0_LOGOUT === undefined) return false;
    if (process.env.AUTH_0_LOGOUT.toLocaleLowerCase() === 'true') return true;
    return false;
}

function generateOAuthConfig() {
    const authRoutes = {
        callback: '/callback',
        login: '/authenticate',
        postLogoutRedirect: '/login',
        logout: '/logout',
    };

    const logoutParams = {
        end_session_endpoint: '/end-session/',
    };

    const authConfig = {
        authRequired: true,
        auth0Logout: checkAuth0Logout(),
        baseURL: process.env.BASE_URL,
        clientID: process.env.CLIENT_ID,
        issuerBaseURL: process.env.ISSUER_BASE_URL,
        secret: process.env.SECRET,
        clientSecret: process.env.SECRET,
        // authorizationParams: {
        //     response_type: 'code',
        //     scope: 'openid profile email read:reports',
        // },
        routes: authRoutes,
        idpLogout: true,
        logoutParams: logoutParams,
    };
    return authConfig;
}

export = {
    generateOAuthConfig,
    getOAuthStatus,
    enableOAuth,
    disableOAuth,
    isOpenIDEnabled,
    checkOpenIDRequirements,
    authenticateUser,
    isTokenValid,
};
