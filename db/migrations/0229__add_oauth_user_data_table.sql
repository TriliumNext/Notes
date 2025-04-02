-- Add the oauth user data table
CREATE TABLE IF NOT EXISTS "user_data"
(
    tmpID INT,
    username TEXT,
    email TEXT,
    userIDEncryptedDataKey TEXT,
    userIDVerificationHash TEXT,
    salt TEXT,
    derivedKey TEXT,
    isSetup TEXT DEFAULT "false",
    UNIQUE (tmpID),
    PRIMARY KEY (tmpID)
);