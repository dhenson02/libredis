"use strict";

const isDev = process.env.NODE_ENV === `development`;

const debugLogger = isDev
    ? console.log
    : () => {};

module.exports = {
    isDev,
    debugLogger,
};
