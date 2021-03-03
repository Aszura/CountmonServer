"use strict";
const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../auth");

function sendAuthError(res, err) {
    console.log("Auth error: " + err);
    res.redirect("/users/login");
}

/* GET users listing. */
router.get("/adduser", function (req, res) {
    auth.register(req.query.email, hash, req.query.firstname, req.query.lastname)
        .then(function () {
            res.send("User added!");
        })
        .catch(function (err) {
            res.send("Failed to register user: " + err);
        });
});

//router.get("/getuser", function (req, res) {
//    let userTable = new db.Datatable("users");

//    userTable
//        .selectAllWhere("id", req.query.id)
//        .then(function (results) {
//            res.send("User: " + JSON.stringify(results));
//        })
//        .catch(function (err) {
//            console.log("Error on select: " + err);
//        });
//});

router.post("/login", function (req, res) {
    let email = req.body.email;
    let pw = req.body.pw;

    auth.login(res, email, pw)
        .then(function () {
            res.send("User '" + email + "' logged in successfully!");
        })
        .catch(function (err) {
            sendAuthError(res, err);
        });
});

router.use("/member", function (req, res, next) {
    auth.verifyToken(res, req.cookies["auth"])
        .then(function () {
            next();
        })
        .catch(function (err) {
            sendAuthError(res, err);
        });
});

router.get("/member/me", function (req, res) {
    let userTable = new db.Datatable("users");
    let token = auth.tokenPayload(req.cookies["auth"]);

    userTable
        .selectWhere(["firstname", "lastname"], "id", token.id)
        .then(function (results) {
            res.send(results);
        });
});

module.exports = router;
