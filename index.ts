"use strict";

import os from "os";
import cluster from "cluster";

import {
    config as envInit,
} from "dotenv";

envInit();

const {
    NODE_ENV,
} = process.env;

// import { logger } from "./util/logger";

export const forceExit = worker => e => {
    worker.exit(1);
};

export function reFork () {
    const worker = cluster.fork({ NODE_ENV, });
    worker.on('error', forceExit(worker));
    worker.on('exit', () => reFork());
}

if ( cluster.isMaster ) {
    NODE_ENV === `development`
        ? reFork()
        : os.cpus().forEach(reFork);
}
else {
    const { getPrefix } = await import('./api/index.js');

    const redis = getPrefix(`a`);
    let current;
    do {
        current = await redis.next();
        console.log(current.value);
    }
    while ( !current.done );

    // let a = setTimeout(() => {
    //     clearTimeout(a);
    //     getPrefix(`ab`);
    // }, 1000);

    // getPrefix(`abc`);
    // getPrefix(`abcd`);
    // getPrefix(`abcde`);
    // getPrefix(`abcdef`);
    // let a = setTimeout(() => {
    //     clearTimeout(a);
    //     getPrefix(`abcdefg`);
    //     getPrefix(`abcdefgh`);
    //     getPrefix(`abcdefghi`);
    //     getPrefix(`abcdef`);
    //     getPrefix(`abcde`);
    // }, 1000);
}
