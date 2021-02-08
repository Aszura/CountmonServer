"use strict";
var express = require("express");
var router = express.Router();
var db = require("../db");
var bcrypt = require("bcrypt");
const saltRoundsPassword = 12;
var jwt = require("jsonwebtoken");
var crypto = require("crypto");
const expireTimeSeconds = 300;
const refreshTimeMs = 86400000;
const cookieHttpOnly = true;
const cookieSecure = false;

const secret = crypto.randomBytes(256);

function sendAuthError(res, err) {
    console.log("Error: " + err);
    res.status(401).send();
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
            return res.send("User added!");
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
            return res.send("User: " + JSON.stringify(results));
        })
        .catch(function (err) {
            console.log("Error on select: " + err);
        });
});

router.get("/login", function (req, res) {
    let userTable = new db.Datatable("users");
    let tokenTable = new db.Datatable("authToken");
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
            let token = jwt.sign({ id: userId }, secret, { issuer: "its-simon.at", audience: "its-simon.at", expiresIn: expireTimeSeconds });
            res.cookie("auth", token, { httpOnly: cookieHttpOnly, secure: cookieSecure });

            return tokenTable.delete("userid", userId);
        })
        .then(function () {
            let date = Date.now() + refreshTimeMs;
            return tokenTable.insert(["userid", "refreshTime"], [userId, date.toString()]);
        })
        .then(function () {
            return res.send("User '" + req.query.email + "' logged in successfully!");
        })
        .catch(function (err) {
            return sendAuthError(res, err);
        });
});

router.get("/me", function (req, res) {
    let tokenTable = new db.Datatable("authToken");
    let token;

    // Check for token
    if (!req.cookies["auth"]) {
        return sendAuthError(res, new Error("Auth cookie missing!"));
    }

    // Verify token
    try {
        token = jwt.verify(req.cookies["auth"], secret, { issuer: "its-simon.at", audience: "its-simon.at" });
        return res.send("All is well...");
    }
    catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            token = jwt.decode(req.cookies["auth"]);
            tokenTable
                .selectWhere("refreshTime", "userid", token.id)
                .then(function (results) {
                    if (!results) {
                        return Promise.reject(new Error("No refresh token found!"));
                    }

                    let date = new Date(parseInt(results[0].refreshTime));
                    if (date < Date.now()) {
                        return Promise.reject(new Error("Refresh token expired!"));
                    }

                    let newToken = jwt.sign({ id: token.id }, secret, { issuer: "its-simon.at", audience: "its-simon.at", expiresIn: expireTimeSeconds });
                    res.cookie("auth", newToken, { httpOnly: cookieHttpOnly, secure: cookieSecure });
                    let newDate = Date.now() + refreshTimeMs;
                    return tokenTable.update(["refreshTime"], [newDate.toString()], "userid", token.id);
                })
                .then(function () {
                    return res.send("Updated token. All is well...");
                })
                .catch(function (err) {
                    sendAuthError(res, err);
                });
        }
        else {
            return sendAuthError(res, err);
        }
    }
});

module.exports = router;
