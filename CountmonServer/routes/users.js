"use strict";
var express = require("express");
var router = express.Router();
var db = require("../db");
var bcrypt = require("bcrypt");
var saltRounds = 12;

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

    userTable
        .selectWhere("password", "email", req.query.email)
        .then(function (result) {
            return bcrypt.compare(req.query.pw, result[0].password);
        })
        .then(function (result) {
            if (result) {
                return res.send("User '" + req.query.email + "' logged in successfully!");
            }
            else {
                return res.status(401).send("User '" + req.query.email + "' entered wrong password!");
            }
        })
        .catch(function (err) {
            console.log("Login error: " + err);
            return res.status(500).send();
        });
});

module.exports = router;
