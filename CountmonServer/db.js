"use strict";
const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "service.its-simon.at",
    user: "c1_sql",
    password: "q9Wd!vS6",
    database: "c1_countmontest",
    connectionLimit: 1
});


var db = {
    query: function (querystring) {
        return new Promise(function (resolve, reject) {
            pool.query(querystring, function (err, results) {
                if (err) {
                    console.log("db error: " + err.code);
                    reject(new Error(err.message));
                }
                else {
                    resolve(results);
                }
            });
        })
        
    },
    queryValues: function (querystring, values) {
        return new Promise(function (resolve, reject) {
            pool.query(querystring, values, function (err, results) {
                if (err) {
                    console.log("db error: " + err.code);
                    reject(new Error(err.message));
                }
                else {
                    resolve(results);
                }
            });
        })
    },
    Datatable: class Datatable {
        constructor(table) {
            this.table = table;
        }

        insert(fields, values) {
            let thisObj = this; 

            return new Promise(function (resolve, reject) {
                if (fields.length != values.length) {
                    reject(new Error("Array length of 'fields' and 'values' don't match!"));
                }
                else {
                    let placeholders = [];
                    values.forEach(x => placeholders.push("?"));
                    let queryString = "INSERT INTO " + thisObj.table + "(" + fields.join(",") + ") VALUES (" + placeholders.join(",") + ")";

                    pool.query(queryString, values, function (err) {
                        if (err) {
                            console.log("db error: " + err.code);
                            reject(new Error(err.message));
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        }

        delete(whereField, whereValue) {
            let thisObj = this;

            return new Promise(function (resolve, reject) {
                pool.query("DELETE FROM " + thisObj.table + " where " + whereField + " = ?", [whereValue], function (err) {
                    if (err) {
                        console.log("db error: " + err.code);
                        reject(new Error(err.message));
                    }
                    else {
                        resolve();
                    }
                });
            });
        }

        update(fields, values, whereField, whereValue) {
            let thisObj = this;

            return new Promise(function (resolve, reject) {
                if (fields.length != values.length) {
                    reject(new Error("Array length of 'fields' and 'values' don't match!"));
                }
                else {
                    let set = [];
                    fields.forEach(x => set.push(x + " = ?"));
                    let query = "UPDATE " + thisObj.table + " SET " + set.join(",") + " where " + whereField + " = ?";

                    let placeholders = values;
                    placeholders.push(whereValue);

                    pool.query(query, placeholders, function (err, result) {
                        if (err) {
                            console.log("db error: " + err.code);
                            reject(new Error(err.message));
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        }

        selectAll() {
            return this.select("*");
        }

        selectAllWhere(whereField, whereValue) {
            return this.selectWhere("*", whereField, whereValue);
        }

        select(fields) {
            let thisObj = this;
            let selectString = "";

            if (Array.isArray(fields)) {
                selectString = fields.join(",");
            }
            else {
                selectString = fields;
            }

            return new Promise(function (resolve, reject) {
                pool.query("select " + selectString + " from " + thisObj.table, function (err, results) {
                    if (err) {
                        console.log("db error: " + err.code);
                        reject(new Error(err.message));
                    }
                    else {
                        resolve(results);
                    }
                });
            });
        }

        selectWhere(fields, whereField, whereValue) {
            let thisObj = this;
            let selectString = "";

            if (Array.isArray(fields)) {
                selectString = fields.join(",");
            }
            else {
                selectString = fields;
            }

            return new Promise(function (resolve, reject) {
                pool.query("select " + selectString + " from " + thisObj.table + " where " + whereField + " = ?", [whereValue], function (err, results) {
                    if (err) {
                        console.log("db error: " + err.code);
                        reject(new Error(err.message));
                    }
                    else {
                        resolve(results);
                    }
                });
            });
        }
    },    
};

module.exports = db;