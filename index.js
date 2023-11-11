"use strict";

const {
    config: envInit,
} = require("dotenv");

envInit();

const {
    Connect,
} = require("./data/connect");

module.exports = {
    Connect,
};
