"use strict";
var express = require("express");
var router = express.Router();
var db = require("../db");
var bcrypt = require("bcrypt");
var saltRounds = 12;

/* GET users listing. */
router.get("/adduser", function (req, res) {
    bcrypt
        .hash("test", saltRounds)
        .then(function (hash) {
            return db.queryValues("insert into users(email, password, firstname, lastname) values (?, ?, ?, ?)", ["info@its-simon.at", hash, "simon", "dobersberger"]);
        })
        .then(function (results) {
            return res.send("User added!");
        })
        .catch(function (err) {
           console.log("Error on insert: " + err.code);
        });
});

router.get("/getuser", function (req, res) {
    bcrypt
        .hash("test", saltRounds)
        .then(function (hash) {
            return db.queryValues("select * FROM users WHERE id = ?", [req.query.id]);
        })
        .then(function (results) {
            return res.send("User: " + JSON.stringify(results));
        })
        .catch(function (err) {
            console.log("Error on select: " + err.code);
        });
});

module.exports = router;
