"use strict";
const express = require("express");
const router = express.Router();
const db = require("../db");
const auth = require("../auth");
const upload = require("../upload");


router.use("/", function (req, res, next) {
    auth.verifyToken(res, req.cookies["auth"])
        .then(function () {
            next();
        })
        .catch(function (err) {
            sendAuthError(res, err);
        });
});

router.get("/getIncoming", function (req, res) {
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

router.get("/getOutgoing", function (req, res) {
    let token = auth.tokenPayload(req.cookies["auth"]);

    return db
        .queryValues("SELECT * FROM invoices WHERE userid = '?' AND isoutgoing = '?'", [token.id, 1])
        .then(function (results) {
            res.send(results);
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.get("/getAll", function (req, res) {
    let token = auth.tokenPayload(req.cookies["auth"]);

    return db
        .queryValues("SELECT * FROM invoices WHERE userid = '?'", [token.id])
        .then(function (results) {
            res.send(results);
        })
        .catch(function (err) {
            res.send(err);
        });
});

router.post("/add", upload.single("file"), function (req, res) {
    let token = auth.tokenPayload(req.cookies["auth"]);
    const supplier = req.body.supplier;
    const invoiceDate = req.body.invoiceDate;
    const nettosum = req.body.nettosum;
    const bruttosum = req.body.bruttosum;
    const tax = bruttosum - nettosum;
    const file = req.file;
    const isOutgoing = String(req.body.isOutgoing).toLowerCase() === "true";

    const valueArray = [token.id, supplier, invoiceDate, nettosum, bruttosum, tax, file.path, isOutgoing];
    const invoicesTable = new db.Datatable("invoices");

    return invoicesTable
        .insert(["userid", "name", "date", "nettosum", "bruttosum", "tax", "filepath", "isoutgoing"], valueArray)
        .then(function (results) {
            console.log("Added new invoice: " + valueArray);
            res.send("Added new invoice: " + valueArray);
        })
        .catch(function (err) {
            console.log(err);
            res.send(err);
        });
});

router.get("/download", function (req, res) {
    const token = auth.tokenPayload(req.cookies["auth"]);
    const invoiceId = Number(req.query.id);

    return db
        .queryValues("SELECT filepath FROM invoices WHERE id = '?' AND userid = '?'", [invoiceId, token.id])
        .then(function (results) {
            res.download(results[0].filepath);
        })
        .catch(function (err) {
            res
                .status(401)
                .render("error", {
                    message: "You are not authorized to access this ressource! The admin has been notified. Please go back to the previous page!",
                    error: {}
                });
        });
});

module.exports = router;
