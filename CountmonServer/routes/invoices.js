"use strict";
const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../auth");

router.use("/", function (req, res, next) {
    auth.verifyToken(res, req.cookies["auth"])
        .then(function () {
            next();
        })
        .catch(function (err) {
            sendAuthError(res, err);
        });
});

router.get("/", function (req, res) {
    let token = auth.tokenPayload(req.cookies["auth"]);

    return db
        .queryValues("SELECT * FROM invoices WHERE userid = '?' AND isoutgoing = '?'", [token.id, 0])
        .then(function (results) {
            res.send(results);
        })
        .catch(function (err) {
            res.send(err);
        });
});

module.exports = router;
