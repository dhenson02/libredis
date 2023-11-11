"use strict";

export const isDev = process.env.NODE_ENV === `development`;

export const debugLogger = isDev
    ? console.log
    : () => {};
