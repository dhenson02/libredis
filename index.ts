"use strict";

import {
    config as envInit,
} from "dotenv";

envInit();

import { run } from "./api/index.js";

/**
 * This file is used as an demonstration of connect.ts async handling
 * and connection pooling/management
 */

(async () => {
    const redis = run(`a`);
    for await ( const current of redis ) {
        console.log(current);
    }
})()

setTimeout(async () => {
    for await ( const current2 of run(`def`) ) {
        console.log(current2);
    }
}, 1000);

setTimeout(async () => {
    for await ( const current2 of run(`ggg`) ) {
        console.log(current2);
    }
}, 1500);

setTimeout(async () => {
    for await ( const current2 of run(`hhh`) ) {
        console.log(current2);
    }
}, 2500);
