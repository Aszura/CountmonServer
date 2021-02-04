"use strict";
var express = require("express");
var mysql = require("mysql");

var pool = mysql.createPool({
    host: "service.its-simon.at",
    user: "c1_sql",
    password: "q9Wd!vS6",
    database: "c1_countmontest",
    connectionLimit: 1
});

var db = {
    query: function (querystring, callback) {
        return new Promise(function (resolve, reject) {
            pool.query(querystring, function (err, results) {
                if (err) {
                    console.log("db error: " + err.code);
                    reject(err);
                }
                else {
                    resolve(results);
                }
            });
        })
        
    },
    queryValues: function (querystring, values, callback) {
        return new Promise(function (resolve, reject) {
            pool.query(querystring, values, function (err, results) {
                if (err) {
                    console.log("db error: " + err.code);
                    reject(err);
                }
                else {
                    resolve(results);
                }
            });
        })
    },
    select: function (selectstring, tablestring, callback) {
        let querystring = "SELECT " + selectstring + " FROM " + tablestring;
        pool.query(querystring, [selectstring, tablestring], callback);
    },
    selectWhere: function (selectstring, tablestring, wherecolumnstring, wherevaluestring, callback) {
        let querystring = "SELECT " + selectstring + " FROM " + tablestring + " WHERE " + wherecolumnstring + " = ?";
        pool.query(querystring, [wherevaluestring], callback);
    },
    insert: function (tablestring, valuesstring, callback) {
        let querystring = "INSERT INTO " + tablestring + " VALUES " + valuesstring;
        pool.query(querystring, [tablestring, valuesstring], callback);
    },
};

module.exports = db;
