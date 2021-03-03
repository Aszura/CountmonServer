"use strict";
let auth = {};
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const saltRoundsPassword = 12;
const expireTimeSeconds = 300;
const refreshTimeMs = 86400000;
const cookieHttpOnly = true;
const cookieSecure = false;
const cookieSameSitePolicy = "strict";
const tokenIssuer = "its-simon.at";
const tokenAudience = "its-simon.at";
const secret = crypto.randomBytes(256);

function registerNewToken(res, userId, payload) {
    return new Promise(function (resolve, reject) {
        let tokenTable = new db.Datatable("authToken");
        let token = jwt.sign(payload, secret, { issuer: tokenIssuer, audience: tokenAudience, expiresIn: expireTimeSeconds });
        res.cookie("auth", token, { httpOnly: cookieHttpOnly, secure: cookieSecure, sameSite: cookieSameSitePolicy });

        let date = Date.now() + refreshTimeMs;
        return tokenTable
            .delete("userid", userId)
            .then(function (result) {
                return tokenTable.insert(["userid", "refreshTime"], [userId, date.toString()]);
            })
            .then(function (result) {
                resolve();
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

function refreshToken(res, authCookie) {
    return new Promise(function (resolve, reject) {
        let token;
        let tokenTable;

        // Verify again ignoring expiration, never trusting code outside to verify first
        jwt.verify(authCookie, secret, { issuer: tokenIssuer, audience: tokenAudience, ignoreExpiration: true }, function (err, decodedToken) {
            if (err) return reject(err);
            token = decodedToken;
        });

        // Check if token is allowed to refresh
        tokenTable = new db.Datatable("authToken");
        return tokenTable
            .selectWhere("refreshTime", "userid", token.id)
            .then(function (results) {
                if (!results) {
                    return reject(new Error("No refresh token found!"));
                }

                let date = new Date(parseInt(results[0].refreshTime));
                if (date < Date.now()) {
                    return reject(new Error("Refresh token expired!"));
                }

                return registerNewToken(res, token.id, token);
            })
            .then(function () {
                console.log("Updated token for user id " + token.id);
                resolve();
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

auth.verifyToken = function verifyToken(res, authCookie) {
    return new Promise(function (resolve, reject) {
        // Check for token
        if (!authCookie) {
            /*return*/ reject(new Error("Auth cookie missing!"))
        }

        // Verify token
        jwt.verify(authCookie, secret, { issuer: tokenIssuer, audience: tokenAudience }, function (err, token) {
            if (!err) {
                /*return*/ resolve();
            }

            if (err instanceof jwt.TokenExpiredError) {
                refreshToken(res, authCookie)
                    .then(function () {
                        resolve();
                    })
                    .catch(function (tokenErr) {
                        reject(tokenErr);
                    });
            }
            else {
                reject(tokenErr);
            }
        });
    });
}

auth.login = function login(res, email, pw) {
    return new Promise(function (resolve, reject) {
        if (!email || !pw) {
            /*return*/ reject(new Error("No Email or password provided!"));
        }

        let userTable = new db.Datatable("users");
        let userId = 0;

        userTable
            .selectWhere(["id", "password"], "email", email)
            .then(function (result) {
                userId = result[0].id;
                return bcrypt.compare(pw, result[0].password);
            })
            .then(function (valid) {
                if (!valid) {
                    /*return*/ reject(new Error("User '" + email + "' entered wrong password!"));
                }
                return registerNewToken(res, userId, { id: userId });
            })
            .then(function () {
                resolve();
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

auth.register = function register(email, pw, firstname, lastname) {
    return new Promise(function (resolve, reject) {
        let userTable = new db.Datatable("users");

        bcrypt
            .hash(pw, saltRoundsPassword)
            .then(function (hash) {
                return userTable.insert(["email", "password", "firstname", "lastname"], [email, hash, firstname, lastname]);
            })
            .then(function (results) {
                resolve();
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

auth.tokenPayload = function tokenPayload(authCookie) {
    if (!authCookie) {
        return null;
    }

    return jwt.decode(authCookie);
}

module.exports = auth;
