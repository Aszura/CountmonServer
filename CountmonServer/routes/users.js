"use strict";
var express = require("express");
var router = express.Router();
var db = require("../db");
var bcrypt = require("bcrypt");
var saltRounds = 12;
var jwt = require("jsonwebtoken");

/* GET users listing. */
router.get("/adduser", function (req, res) {
    let userTable = new db.Datatable("users");

    bcrypt
        .hash("test", saltRounds)
        .then(function (hash) {
            return userTable.insert(["email", "password", "firstname", "lastname"], ["info@its-simon.at", hash, "simon", "dobersberger"]);
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
    let userId = 0;

    userTable
        .selectWhere(["id", "password"], "email", req.query.email)
        .then(function (result) {
            userId = result[0].id;
            return bcrypt.compare(req.query.pw, result[0].password);
        })
        .then(function (result) {
            if (result) {
                let token = jwt.sign({ id: userId }, "secret", { expiresIn: 8640 });
                res.cookie("auth", token);
                return bcrypt.hash(token, saltRounds);
            }
            else {
                return res.status(401).send("User '" + req.query.email + "' entered wrong password!");
            }
        })
        .then(function (hash) {
            let tokenTable = new db.Datatable("authToken");
            return tokenTable.insert(["userid", "token"], [userId, hash]);
        })
        .then(function () {
            return res.send("User '" + req.query.email + "' logged in successfully!");
        })
        .catch(function (err) {
            console.log("Login error: " + err);
            return res.status(500).send();
        });
});

router.get("/me", function (req, res) {
    let userTable = new db.Datatable("users");

    if (!req.cookies["auth"]) {
        res.status(401).send("Not logged in!");
    }
    else {
        let token = jwt.verify(req.cookies["auth"], "secret");
        return userTable
            .selectAllWhere("id", token.id)
            .then(function (result) {
                return res.send(result);
            })
            .catch(function (err) {
                console.log("Error: " + err);
                return res.status(401).send();
            });
    }
});

module.exports = router;
