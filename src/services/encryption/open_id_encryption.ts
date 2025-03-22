import myScryptService from "./my_scrypt.js";
import utils from "../utils.js";
import dataEncryptionService from "./data_encryption.js";
import sql from "../sql.js";
import sqlInit from "../sql_init.js";
import OpenIDError from "../../errors/open_id_error.js";

function saveUser(subjectIdentifier: string, name: string, email: string) {
  if (isUserSaved()) return false;

  const verificationSalt = utils.randomSecureToken(32);
  const derivedKeySalt = utils.randomSecureToken(32);

  const verificationHash = myScryptService.getSubjectIdentifierVerificationHash(
    subjectIdentifier,
    verificationSalt
  );
  if (verificationHash === undefined) {
    throw new OpenIDError("Verification hash undefined!")
  }

  const userIDEncryptedDataKey = setDataKey(
    subjectIdentifier,
    utils.randomSecureToken(16),
    verificationSalt
  );

  if (userIDEncryptedDataKey === undefined || userIDEncryptedDataKey === null) {
    console.log("USERID ENCRYPTED DATA KEY NULL");
    return undefined;
  }

  const data = {
    tmpID: 0,
    userIDVerificationHash: utils.toBase64(verificationHash),
    salt: verificationSalt,
    derivedKey: derivedKeySalt,
    userIDEcnryptedDataKey: userIDEncryptedDataKey,
    isSetup: "true",
    username: name,
    email: email
  };

  sql.upsert("user_data", "tmpID", data);
  return true;
}

function isSubjectIdentifierSaved() {
  const value = sql.getValue("SELECT userIDEcnryptedDataKey FROM user_data;");
  if (value === undefined || value === null || value === "") return false;
  return true;
}

function isUserSaved() {
  const isSaved = sql.getValue<string>("SELECT isSetup FROM user_data;");
  return isSaved === "true" ? true : false;
}
 
function verifyOpenIDSubjectIdentifier(subjectIdentifier: string) {
  if (!sqlInit.isDbInitialized()) {
    throw new OpenIDError("Database not initialized!");
  }

  if (isUserSaved()) {
    return false;
  }

  const salt = sql.getValue("SELECT salt FROM user_data;");
  if (salt == undefined) {
    console.log("Salt undefined");
    return undefined;
  }

  const givenHash = myScryptService
    .getSubjectIdentifierVerificationHash(subjectIdentifier)
    ?.toString("base64");
  if (givenHash === undefined) {
    console.log("Sub id hash undefined!");
    return undefined;
  }

  const savedHash = sql.getValue(
    "SELECT userIDVerificationHash FROM user_data"
  );
  if (savedHash === undefined) {
    console.log("verification hash undefined");
    return undefined;
  }

  console.log("Matches: " + givenHash === savedHash);
  return givenHash === savedHash;
}

function setDataKey(
  subjectIdentifier: string,
  plainTextDataKey: string | Buffer,
  salt: string
) {
  const subjectIdentifierDerivedKey =
    myScryptService.getSubjectIdentifierDerivedKey(subjectIdentifier, salt);

  if (subjectIdentifierDerivedKey === undefined) {
    console.log("SOMETHING WENT WRONG SAVING USER ID DERIVED KEY");
    return undefined;
  }
  const newEncryptedDataKey = dataEncryptionService.encrypt(
    subjectIdentifierDerivedKey,
    plainTextDataKey
  );

  return newEncryptedDataKey;
}

function getDataKey(subjectIdentifier: string) {
  const subjectIdentifierDerivedKey =
    myScryptService.getSubjectIdentifierDerivedKey(subjectIdentifier);

  const encryptedDataKey = sql.getValue(
    "SELECT userIDEcnryptedDataKey FROM user_data"
  );

  if (encryptedDataKey === undefined || encryptedDataKey === null) {
    console.log("Encrypted data key empty!");
    return undefined;
  }

  if (subjectIdentifierDerivedKey === undefined) {
    console.log("SOMETHING WENT WRONG SAVING USER ID DERIVED KEY");
    return undefined;
  }
  const decryptedDataKey = dataEncryptionService.decrypt(
    subjectIdentifierDerivedKey,
    encryptedDataKey.toString()
  );

  return decryptedDataKey;
}

export default {
  verifyOpenIDSubjectIdentifier,
  getDataKey,
  setDataKey,
  saveUser,
  isSubjectIdentifierSaved,
};