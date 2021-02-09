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
    console.log("Auth error: " + err);
    return res.redirect("/users/login");
}

function refreshToken(req, res, next) {

    let tokenTable = new db.Datatable("authToken");
    let token = jwt.decode(req.cookies["auth"]);

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
            console.log("Updated token for user id " + token.id);
            return next();
        })
        .catch(function (err) {
            return sendAuthError(res, err);
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
    if (!req.query.email || !req.query.pw) {
        return res.send("Please login!");
    }

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

router.use("/member", function (req, res, next) {
    // Check for token
    if (!req.cookies["auth"]) {
        return sendAuthError(res, new Error("Auth cookie missing!"));
    }

    // Verify token
    try {
        jwt.verify(req.cookies["auth"], secret, { issuer: "its-simon.at", audience: "its-simon.at" });
        next();
    }
    catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return refreshToken(req, res, next);
        }
        else {
            return sendAuthError(res, err);
        }
    }
});

router.get("/member/me", function (req, res) {
    let userTable = new db.Datatable("users");
    let token = jwt.decode(req.cookies["auth"]);

    userTable
        .selectWhere(["firstname", "lastname"], "id", token.id)
        .then(function (results) {
            return res.send(results);
        });
});

module.exports = router;
