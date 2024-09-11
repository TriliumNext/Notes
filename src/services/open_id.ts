import OpenIDError from "../errors/open_id_error.js";
import { NextFunction, Request, Response } from "express";
import openIDEncryption from "./encryption/open_id_encryption.js";
import sqlInit from "./sql_init.js";
import options from "./options.js";
import { Session, auth } from "express-openid-connect";
import sql from "./sql.js";

function isOpenIDEnabled() {
  return checkOpenIDRequirements();
}

function isUserSaved() {
  const data = sql.getValue<string>("SELECT isSetup FROM user_data;");
  return data === "true" ? true : false;
}

function getUsername() {
  const username = sql.getValue<string>("SELECT username FROM user_data;");
  return username;
}

function getUserEmail() {
  const email = sql.getValue<string>("SELECT email FROM user_data;");
  return email;
}

function clearSavedUser() {
  sql.execute("DELETE FROM user_data");
  options.setOption("isUserSaved", false);
  return {
    success: true,
    message: "Account data removed."
  };
}

function checkOpenIDRequirements() {
  if (process.env.SSO_ENABLED === undefined) {
    return false;
  }
  if (process.env.SSO_ENABLED.toLocaleLowerCase() !== "true") {
    return false;
  }

  if (process.env.TOTP_ENABLED?.toLocaleLowerCase() === "true"){
    throw new OpenIDError("Cannot enable both OpenID and TOTP!");
  }

  if (process.env.BASE_URL === undefined) {
    throw new OpenIDError("BASE_URL is undefined in .env!");
  }
  if (process.env.CLIENT_ID === undefined) {
    throw new OpenIDError("CLIENT_ID is undefined in .env!");
  }
  if (process.env.SECRET === undefined) {
    throw new OpenIDError("SECRET is undefined in .env!");
  }

  return true;
}

function getOAuthStatus() {
  return {
    success: true,
    name: getUsername(),
    email: getUserEmail(),
    enabled: isOpenIDEnabled(),
  };
}

function isTokenValid(req: Request, res: Response, next: NextFunction) {
  const userStatus = openIDEncryption.isSubjectIdentifierSaved();

  if (req.oidc !== undefined) {
    const result = req.oidc
      .fetchUserInfo()
      .then((result) => {
        return {
          success: true,
          message: "Token is valid",
          user: userStatus,
        };
      })
      .catch((result) => {
        return {
          success: false,
          message: "Token is not valid",
          user: userStatus,
        };
      });
    return result;
  } else {
    return {
      success: false,
      message: "Token not set up",
      user: userStatus,
    };
  }
}

function generateOAuthConfig() {
  const authRoutes = {
    callback: "/callback",
    login: "/authenticate",
    postLogoutRedirect: "/login",
    logout: "/logout",
  };

  const logoutParams = {
  };

  const authConfig = {
    authRequired: true,
    auth0Logout: false,
    baseURL: process.env.BASE_URL,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: "https://accounts.google.com/.well-known/openid-configuration",
    secret: process.env.SECRET,
    clientSecret: process.env.SECRET,
    authorizationParams: {
      response_type: "code",
      scope: "openid profile email",
    },
    routes: authRoutes,
    idpLogout: false,
    logoutParams: logoutParams,
    afterCallback: async (req: Request, res: Response, session: Session) => {
      if (!sqlInit.isDbInitialized()) return session;

      if (isUserSaved()) return session;

      if (req.oidc.user === undefined) {
        console.log("user invalid!");
      }else {
         openIDEncryption.saveUser(
          req.oidc.user.sub.toString(),
          req.oidc.user.name.toString(),
          req.oidc.user.email.toString());
      }
      return session;
    },
  }; 
  return authConfig;
}

export default {
  generateOAuthConfig,
  getOAuthStatus,
  isOpenIDEnabled,
  clearSavedUser,
  checkOpenIDRequirements,
  isTokenValid,
  isUserSaved,
};