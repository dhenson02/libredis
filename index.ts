"use strict";

// import os from "os";
// import cluster from "cluster";

import {
    config as envInit,
} from "dotenv";

envInit();

import { run } from "./api/index.js";

// const {
//     NODE_ENV,
// } = process.env;

// import { logger } from "./util/logger";

// export const forceExit = worker => e => {
//     worker.exit(1);
// };

// export function reFork () {
//     const worker = cluster.fork({ NODE_ENV, });
//     worker.on('error', forceExit(worker));
//     worker.on('exit', () => reFork());
// }

// if ( cluster.isMaster ) {
//     NODE_ENV === `development`
//         ? reFork()
//         : os.cpus().forEach(reFork);
// }
// else {

(async () => {
    const redis = run(`a`);
    for await ( const current of redis ) {
        console.log(current);
    }
})()

    // let a = setTimeout(async () => {
    //     clearTimeout(a);
    // }, 1000);

    // run(`abc`);
    // run(`abcd`);
    // run(`abcde`);
    // run(`abcdef`);
    // let a = setTimeout(() => {
    //     clearTimeout(a);
    //     run(`abcdefg`);
    //     run(`abcdefgh`);
    //     run(`abcdefghi`);
    //     run(`abcdef`);
    //     run(`abcde`);
    // }, 1000);
// }
