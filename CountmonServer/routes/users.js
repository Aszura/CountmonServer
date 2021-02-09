"use strict";
var express = require("express");
var router = express.Router();
var db = require("../db");
var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
var crypto = require("crypto");

const saltRoundsPassword = 12;
const expireTimeSeconds = 300;
const refreshTimeMs = 86400000;
const cookieHttpOnly = true;
const cookieSecure = false;
const tokenIssuer = "its-simon.at";
const tokenAudience = "its-simon.at";
const secret = crypto.randomBytes(256);

function sendAuthError(res, err) {
    console.log("Auth error: " + err);
    res.redirect("/users/login");
}

function registerNewToken(res, userId, payload) {
    let tokenTable = new db.Datatable("authToken");
    let token = jwt.sign(payload, secret, { issuer: tokenIssuer, audience: tokenAudience, expiresIn: expireTimeSeconds });
    res.cookie("auth", token, { httpOnly: cookieHttpOnly, secure: cookieSecure });

    let date = Date.now() + refreshTimeMs;
    return tokenTable
        .delete("userid", userId)
        .then(function (result) {
            return tokenTable.insert(["userid", "refreshTime"], [userId, date.toString()]);
        });
}

function refreshToken(req, res, next) {

    let tokenTable = new db.Datatable("authToken");
    let token = jwt.decode(req.cookies["auth"]);

    return tokenTable
        .selectWhere("refreshTime", "userid", token.id)
        .then(function (results) {
            if (!results) {
                return Promise.reject(new Error("No refresh token found!"));
            }

            let date = new Date(parseInt(results[0].refreshTime));
            if (date < Date.now()) {
                return Promise.reject(new Error("Refresh token expired!"));
            }

            return registerNewToken(res, token.id, token);
        })
        .then(function () {
            console.log("Updated token for user id " + token.id);
            next();
        })
        .catch(function (err) {
            sendAuthError(res, err);
        });
}

/* GET users listing. */
router.get("/adduser", function (req, res) {
    let userTable = new db.Datatable("users");

    bcrypt
        .hash(req.query.pw, saltRoundsPassword)
        .then(function (hash) {
            return userTable.insert(["email", "password", "firstname", "lastname"], [req.query.email, hash, req.query.firstname, req.query.lastname]);
        })
        .then(function (results) {
            res.send("User added!");
        })
        .catch(function (err) {
           console.log("Error on insert: " + err.code);
        });
});

router.get("/getuser", function (req, res) {
    let userTable = new db.Datatable("users");

    userTable
        .selectAllWhere("id", req.query.id)
        .then(function (results) {
            res.send("User: " + JSON.stringify(results));
        })
        .catch(function (err) {
            console.log("Error on select: " + err);
        });
});

router.get("/login", function (req, res) {
    if (!req.query.email || !req.query.pw) {
        return res.send("Please login!");
    }

    let userTable = new db.Datatable("users");
    let userId = 0;

    userTable
        .selectWhere(["id", "password"], "email", req.query.email)
        .then(function (result) {
            userId = result[0].id;
            return bcrypt.compare(req.query.pw, result[0].password);
        })
        .then(function (valid) {
            if (!valid) {
                return Promise.reject(new Error("User '" + req.query.email + "' entered wrong password!"));
            }
            return registerNewToken(res, userId, { id: userId });
        })
        .then(function () {
            res.send("User '" + req.query.email + "' logged in successfully!");
        })
        .catch(function (err) {
            sendAuthError(res, err);
        });
});

router.use("/member", function (req, res, next) {
    // Check for token
    if (!req.cookies["auth"]) {
        return sendAuthError(res, new Error("Auth cookie missing!"));
    }

    // Verify token
    try {
        jwt.verify(req.cookies["auth"], secret, { issuer: tokenIssuer, audience: tokenAudience });
        next();
    }
    catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            refreshToken(req, res, next);
        }
        else {
            sendAuthError(res, err);
        }
    }
});

router.get("/member/me", function (req, res) {
    let userTable = new db.Datatable("users");
    let token = jwt.decode(req.cookies["auth"]);

    userTable
        .selectWhere(["firstname", "lastname"], "id", token.id)
        .then(function (results) {
            res.send(results);
        });
});

module.exports = router;
