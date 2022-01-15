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
})()
