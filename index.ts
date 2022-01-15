"use strict";

import {
    config as envInit,
} from "dotenv";

envInit();

import { run } from "./api/index.js";


(async () => {
    const redis = run(`a`);
    for await ( const current of redis ) {
        console.log(current);
    }

    setTimeout(async () => {
        const redis2 = run(`aa`);
        for await ( const current2 of redis2 ) {
            console.log(current2);
        }
    }, 1500);
    setTimeout(async () => {
        const redis2 = run(`aaa`);
        for await ( const current2 of redis2 ) {
            console.log(current2);
        }
    }, 1500);
    setTimeout(async () => {
        const redis2 = run(`abc`);
        for await ( const current2 of redis2 ) {
            console.log(current2);
        }
    }, 2500);
    setTimeout(async () => {
        const redis2 = run(`abc`);
        for await ( const current2 of redis2 ) {
            console.log(current2);
        }
    }, 2500);
    setTimeout(async () => {
        const redis2 = run(`abc`);
        for await ( const current2 of redis2 ) {
            console.log(current2);
        }
    }, 3500);
    setTimeout(async () => {
        const redis2 = run(`abc`);
        for await ( const current2 of redis2 ) {
            console.log(current2);
        }
    }, 5500);
})()

setTimeout(async () => {
    for await ( const current2 of run(`def`) ) {
        console.log(current2);
    }
}, 15500);
