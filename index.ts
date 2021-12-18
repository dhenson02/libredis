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
    os.cpus().forEach(reFork);
}
else {
    const a = require('./api');
    console.log(a);
}
