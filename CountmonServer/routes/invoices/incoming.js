"use strict";
var express = require("express");
var router = express.Router();
var db = require("../../db");


/* GET home page. */
router.get("/", function (req, res) {
    db.insert("users(username, password, firstname, lastname)", "('simon', 'test', 'simon', 'dobersberger')", function (err, results, fields) {
    //db.query("INSERT INTO users (username, password, firstname, lastname) VALUES ('simon','simon','simon','simon')", function (err, results, fields) {
    //db.select("*", "users", function (err, results, fields) {
        if (err) console.log("Error on insert: " + err.code);
    });
    res.render("index", { title: "Express Test" });
});

module.exports = router;
