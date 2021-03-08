"use strict";
const multer = require("multer");
const auth = require("./auth");
const moment = require("moment");
const fs = require("fs");

// Set storage path for uploading files
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const token = auth.tokenPayload(req.cookies["auth"]);
        const foldername = "./uploads/" + moment().format("YYYY") + "/" + moment().format("MM") + "/" + token.id;

        fs.mkdir(foldername, { recursive: true }, function (err) {
            if (err) {
                throw err;
            } else {
                cb(null, foldername);
            }
        })
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

var upload = multer({ storage: storage });

module.exports = upload;